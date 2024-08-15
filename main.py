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
        'type': 'service',
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

    'di er': {
        'type': 'combat',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': False,
        'present': True
    },

    'jian jun': {
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
        'present': False,
        'reason_for_absence': 'MC'
    },

    "syafi'i": {
        'type': 'service',
        'status': 'stay-out',
        'permanent': True,
        'excuse_rmj': True,
        'present': True,
    },

    'joshua': {
        'type': 'service',
        'status': 'stay-out',
        'permanent': True,
        'excuse_rmj': False,
        'present': True,
        # 'reason_for_absence': 'AL'
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
        'present': False,
        'reason_for_absence': 'MC'
    },

    'hugo': {
        'type': 'service',
        'status': 'stay-in',
        'permanent': True,
        'excuse_rmj': False,
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
for trooper_name in all_troopers.keys():
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
blank_timetable = {}
for trooper in troopers:
    blank_timetable[trooper] = ['' for j in range(len(duty_timings))]

combined_roles = deepcopy(roles)
for key, value in roles_placeholders.items():
    combined_roles[key] = value


# Sequence of generation:
# timetable = assign_sentry_duty(troopers, blank_timetable, roles)
# timetable['hilmi'][0:6] = ['desk', 'desk', 'out', 'x-ray', 'out', 'desk']
# available_shifts = find_all_available_shifts(timetable, duty_timings, troopers)
# allocated_shifts = select_shifts(available_shifts, troopers, shift_blocks, shift_distribution)
# troopers = generate_duty_hours(troopers, timetable, duty_timings, allocated_shifts, roles)
# troopers = add_allocated_shift_to_troopers_dict(allocated_shifts, troopers)
# timetable = or_tools_shift_scheduling(troopers, duty_timings, timetable, roles, shift_blocks)
# timetable = or_tools_role_assignment(troopers, duty_timings, timetable, roles, 3)
# print_timetable(timetable, duty_timings)

import eel
eel.init('web')

@eel.expose
def convert_troopers_to_calendar_resources():
    calendar_resources = []
    trooper_index = 0
    ord_initial = 97
    for trooper_name in troopers:
        calendar_resources.append({
            "id": trooper_index,
            "title": trooper_name.capitalize(),
            "order": chr(ord_initial),
            "extendedProps": {
                "hours": 0,
            }
        })
        trooper_index += 1
        ord_initial += 1
    
    return calendar_resources

@eel.expose
def get_default_parameters():
    shift_block_iso = {}
    for key, timings in shift_blocks.items():
        shift_block_iso[key] = [timing.strftime('%H:%M:%S') for timing in timings]
    
    return {
        'roles': combined_roles,
        'shift_blocks': shift_block_iso,
        'shift_distribution': default_shift_distribution,
        'timetable_date': timetable_date.isoformat(),
        'trooper_keys': list(troopers.keys()),
        'total_hours': compute_hours(duty_timings, troopers, roles)[0],
    }


def convert_timetable_to_calendar_events(timetable):
    events = []
    trooper_index = 0
    for trooper_name, value in timetable.items():
        duty_index = 0
        duties = timetable[trooper_name]
        duties.append('')
        while duty_index <= len(duties) - 2:
            initial_duty_index = duty_index
            if duties[duty_index] != '':

                # Keep the todo singular so its easier to move around (dont clump it together)
                if duties[duty_index] != 'TODO':
                    # keep incrementing if adjacent elements are the same
                    while duties[duty_index] == duties[duty_index + 1]:
                        duty_index += 1

                duty_name = duties[initial_duty_index]
                if duty_name is None:
                    duty_name = 'nil'
                    roles_key = "None"
                elif duty_name == 'TODO':
                    duty_name = 'duty'
                    roles_key = "TODO"
                else:
                    roles_key = duty_name

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
                    "backgroundColor": combined_roles[roles_key]['color'],
                })

                # print(trooper_name, trooper_index, duty_name, initial_datetime, final_datetime)
            
            # Move to the next duty
            duty_index += 1
    
        trooper_index += 1
    
    return events

def get_timing_index(timing, duty_timings):
    for i in range(len(duty_timings)):
        if timing == duty_timings[i]:
            return i
    
    return -1

@eel.expose
def convert_calendar_events_to_timetable(eventsJson):
    timetable = deepcopy(blank_timetable)
    trooper_keys = list(troopers.keys())
    for event in eventsJson:
        # Use this method to parse the date string given
        start_datetime = parser.parse(event['start'])
        start_time = time(hour=start_datetime.hour, minute=start_datetime.minute, second=start_datetime.second)
        start_index = get_timing_index(start_time, duty_timings)

        end_datetime = parser.parse(event['end']) - datetime.timedelta(hours=1)
        end_time = time(hour=end_datetime.hour, minute=end_datetime.minute, second=end_datetime.second)
        end_index = get_timing_index(end_time, duty_timings)

        trooper_name = trooper_keys[int(event['trooper'])]

        if event['role'] == 'nil':
            role_name = None
        elif event['role'] == 'duty':
            role_name = 'TODO'
        else:
            role_name = event['role']


        timetable[trooper_name][start_index: end_index+1] = [role_name for i in range(end_index-start_index+1)]

    
    # print_timetable(timetable, duty_timings)
    # print(blank_timetable)
    return timetable


@eel.expose
def generate_sentry_for_calendar():
    # GENERATE EMPTY TIMETABLE
    timetable = deepcopy(blank_timetable)
    timetable = assign_sentry_duty(troopers, timetable, roles)
    return convert_timetable_to_calendar_events(timetable)


@eel.expose
def assign_shifts_and_hours_for_calendar(eventsJson):
    global troopers
    timetable = convert_calendar_events_to_timetable(eventsJson)
    available_shifts = find_all_available_shifts(timetable, duty_timings, troopers)
    allocated_shifts = select_shifts(available_shifts, troopers, shift_blocks, shift_distribution)
    troopers = generate_duty_hours(troopers, duty_timings, allocated_shifts, roles)

    hours_list = []
    for value in troopers.values():
        hours_list.append(value['assigned_hours'])


    return {
        'hoursList': hours_list,
        'availableShifts': available_shifts,
        'allocatedShifts': allocated_shifts
    }

@eel.expose
def assign_duty_timeslots_to_troopers(exportVal):
    global troopers, shift_blocks
    timetable = convert_calendar_events_to_timetable(exportVal['eventsJson'])
    i = 0
    for trooper_name in troopers:
        trooper_info = troopers[trooper_name]
        trooper_info['assigned_hours'] = exportVal['hours'][i]
        trooper_info['shift'] = exportVal['shift'][i]
        i += 1

    morning_time = time.fromisoformat(exportVal['morningEndingTime'])
    morning_datetime = datetime.datetime.combine(datetime.date.today(), morning_time) - datetime.timedelta(hours=1)
    shift_blocks['morning'][1] = datetime.time(hour=morning_datetime.hour, minute=morning_datetime.minute)
    shift_blocks['afternoon'][0] = time.fromisoformat(exportVal['afternoonStartingTime'])
    print(shift_blocks)

    timetable = or_tools_shift_scheduling(troopers, duty_timings, timetable, roles, shift_blocks)

    return convert_timetable_to_calendar_events(timetable)

@eel.expose
def assign_specific_duties_to_troopers(eventsJson):
    global flag_troopers
    timetable = convert_calendar_events_to_timetable(eventsJson)
    timetable = or_tools_role_assignment(troopers, duty_timings, timetable, roles, 3)
    print_timetable(timetable, duty_timings)

    flag_troopers, breakfast, dinner, last_ensurer = allocate_miscellaneous_roles(all_troopers, timetable)
    print(breakfast, dinner, last_ensurer)
    return {
        'breakfast': breakfast,
        'dinner': dinner,
        'lastEnsurer': last_ensurer,
        'newEvents': convert_timetable_to_calendar_events(timetable)
    }

@eel.expose
def export_timetable(exportData):
    duty_timetable = convert_calendar_events_to_timetable(exportData['duty'])
    duty_filename = "trial/" + generate_filename("normal", timetable_date)

    oc_duty_timetable = convert_calendar_events_to_timetable(exportData['OCDuty'])
    oc_filename = "trial/" + generate_filename("OC", timetable_date)
    

    create_excel(duty_filename, all_troopers, duty_timetable, duty_timings, flag_troopers, exportData['breakfast'], exportData['dinner'], exportData['lastEnsurer'], today=timetable_date)
    create_excel(oc_filename, all_troopers, oc_duty_timetable, duty_timings, flag_troopers, exportData['breakfast'], exportData['dinner'], exportData['lastEnsurer'], today=timetable_date)
    
    return 'Successfully generated timetable'

@eel.expose
def add_trooper(trooperInfo):
    pprint.pprint(trooperInfo)

    return 'sdfsd'


# print(convert_timetable_to_calendar_events())
eel.start('timetable.html')


