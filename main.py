from timetable_scheduling import *
from dateutil import parser

# INITIALISING VARIABLES
duty_timings = [time(x) for x in range(6, 18)]
all_troopers = {
    'hakim': {
        'type': 'combat',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': False,
        'present': True
    },

    'xavier': {
        'type': 'combat',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': False,
        'present': True
    },

    'kah fai': {
        'type': 'combat',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': False,
        'present': True
    },

    'tan di er': {
        'type': 'combat',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': False,
        'present': True
    },

    'aniq': {
        'type': 'service',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': True,
        'present': True,
        # 'reason_for_absence': 'MC'
    },

    'jun': {
        'type': 'service',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': True,
        'present': True,
    },

    "syafi'i": {
        'type': 'service',
        'status': 'stay-out',
        'permanent': True,
        'excuse_rmj': False,
        'present': True,
    },

    'joshua': {
        'type': 'service',
        'status': 'stay-out',
        'permanent': True,
        'excuse_rmj': False,
        'present': False,
        'reason_for_absence': 'AL'
    },

    'aniish': {
        'type': 'service',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': False,
        # 'present': True
        'present': False,
        'reason_for_absence': 'MC'
    },
    
    'hilmi': {
        'type': 'service',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': True,
        'present': True,
    },

    'dhruva': {
        'type': 'service',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': False,
        'present': True,
    },

    'marc': {
        'type': 'service',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': False,
        'present': True
    },
}

# Create present troopers dict
troopers = {}
for trooper_name in all_troopers:
    if all_troopers[trooper_name]['present'] is True:
        troopers[trooper_name] = all_troopers[trooper_name]

# Sorted by standing followed by sitting ==> easier to add as a constraint (can use inequality constraints which is more optimised)
roles = {
    'in': {
        'duration': [1],
        'timing': 'whole-day',
        'color': '#ffff00'
    },

    'out': {
        'duration': [1],
        'timing': 'whole-day',
        'color': '#ff9900'
    },

    'SCA1': {
        'duration': [1],
        'timing': [time(7), time(8)],
        'color': '#ff00ff'
    },

    'SCA2': {
        'duration': [1],
        'timing': [time(7), time(8)],
        'color': '#ff00ff'
    },

    'sentry': {
        'duration': [2, 3],
        'timing': 'whole-day',
        'color': '#ff0000'
    },

    'x-ray': {
        'duration': [1],
        'timing': 'whole-day',
        'color': '#00ffff'
    },

    'desk': {
        'duration': [1],
        'timing': 'whole-day',
        'color': '#00ff00'
    },

    'PAC': {
        'duration': [2],
        'timing': [time(16), time(17)],
        'color': '#f4cccc'
    }
}

roles_placeholders = {
    "None": {
        'color': 'grey',
        'name': 'nil'
    },
    "TODO": {
        'color': '#2E8857',
        'name': 'duty'
    }
}

shift_blocks = {
    'morning': [time(6), time(13)],
    # 'late-morning': [time(8), time(14)],
    'afternoon': [time(10), time(17)]
}

timetable_date = datetime.date.today() + datetime.timedelta(days=1)

default_shift_distribution = determine_shift_distribution(troopers)
shift_distribution = default_shift_distribution

# GENERATE EMPTY TIMETABLE
timetable = {}
for trooper in troopers:
    timetable[trooper] = ['' for j in range(len(duty_timings))]




assign_sentry_duty(troopers, timetable, roles)
timetable['hilmi'][0:6] = ['desk', 'desk', 'out', 'x-ray', 'out', 'desk']
available_shifts = find_all_available_shifts(timetable, duty_timings, troopers)
allocated_shifts = select_shifts(available_shifts, troopers, shift_blocks, shift_distribution)
print(generate_duty_hours(troopers, timetable, duty_timings, allocated_shifts, roles))
add_allocated_shift_to_troopers_dict(allocated_shifts, troopers)
or_tools_shift_scheduling(troopers, duty_timings, timetable, roles, shift_blocks)
or_tools_role_assignment(troopers, duty_timings, timetable, roles, 3)
print_timetable(timetable, duty_timings)

import eel
eel.init('web')

@eel.expose
def convert_troopers_to_calendar_resources():
    calendar_resources = []
    trooper_index = 0
    for trooper_name in troopers:
        calendar_resources.append({
            "id": trooper_index,
            "title": trooper_name.capitalize(),
            "extendedProps": {
                "hours": 0,
                "possibleShifts": list(shift_blocks.keys()) + ['random']
            }
        })
        trooper_index += 1
    
    return calendar_resources

@eel.expose
def get_default_parameters():
    shift_block_iso = {}
    for key, timings in shift_blocks.items():
        shift_block_iso[key] = [timing.strftime('%H:%M:%S') for timing in timings]
    
    combined_roles = roles
    for key, value in roles_placeholders.items():
        combined_roles[key] = value
    
    return {
        'roles': combined_roles,
        'shift_blocks': shift_block_iso,
        'shift_distribution': default_shift_distribution,
        'timetable_date': timetable_date.isoformat()
    }


@eel.expose
def convert_timetable_to_calendar_events():
    events = []
    trooper_index = 0
    for trooper_name in timetable:
        duty_index = 0
        duties = timetable[trooper_name]
        duties.append('')
        while duty_index <= len(duties) - 2:
            initial_duty_index = duty_index
            if duties[duty_index] != '':
                # keep incrementing if adjacent elements are the same
                while duties[duty_index] == duties[duty_index + 1]:
                    duty_index += 1

                duty_name = duties[initial_duty_index]
                initial_hour = duty_timings[initial_duty_index]
                final_hour = duty_timings[duty_index]

                initial_datetime = datetime.datetime.combine(timetable_date, initial_hour)
                final_datetime = datetime.datetime.combine(timetable_date, final_hour)\
                    + datetime.timedelta(hours=1)
                
                # Create event and append to events array
                events.append({
                    "resourceId": trooper_index,
                    "title": duty_name,
                    "start": initial_datetime.isoformat(sep=' '),
                    "end": final_datetime.isoformat(sep=' '),
                    "backgroundColor": roles[duty_name]['color'],
                })
                # print(trooper_name, trooper_index, duty_name, initial_datetime, final_datetime)
            
            # Move to the next duty
            duty_index += 1
    
        trooper_index += 1
    
    return events

# Example of sending info back and forth from javascript to python
@eel.expose        
def print_n(eventsJson):
    print(1)
    # Use this method to parse the date string given
    print([parser.parse(event['start']) for event in eventsJson])

    return '123234235432534534'

eel.getCalendarEvents()(print_n)
# print(convert_timetable_to_calendar_events())
eel.start('timetable.html')


