from datetime import time
import random
from prettytable import PrettyTable
import pprint
from copy import deepcopy
import math
import numpy as np
import xlsxwriter
import datetime
import json
from dateutil.relativedelta import relativedelta, MO
from pathlib import Path

import itertools
from ortools.sat.python import cp_model
# random.seed(3)

'''
Notes from studying the timetables:

- Morning: 
6am-12pm with break at 8am (5h manpower)
6am-1pm with 1 break (6h manpower)
6am-12pm no break (6h manpower)
==> block is from 6am-12pm with/without break


- Late morning (stayout)
8am-2pm no break (6h manpower)
8am-2pm 1 break (5h manpower)
9am-2pm (5h manpower)
==> summarised: block is from 8am to 2pm with/without break


- Afternoon
12pm-6pm no break (6h manpower)
11am-6pm 1 break (6h manpower)
10am-6pm 1 break (7h manpower)


- Random
Aim for one large break between duties so not scattered
'''
class TimetableInputError(Exception):
    pass

def compute_hours(duty_timings, troopers, roles):
    '''
    Compute the number of hours for duty and its distribution.
    For instance, if there are 66 hours of duty to be compled with 13 troopers,
    the hour distribution would be 12 troopers doing 5 hours and 1 trooper
    doing 6 hours.
    '''
    total_hours = 0
    num_troopers = len(troopers)

    for role_name in roles:
        role = roles[role_name]
        if role['timing'] == "whole-day":
            total_hours += len(duty_timings)
        else:
            total_hours += len(role['timing'])
        
    average_hours = total_hours/len(troopers)
    
    min_hours = math.floor(average_hours)
    max_hours = math.ceil(average_hours)

    # This means that all troopers get the same number of hours
    if min_hours == max_hours:
        # workaround
        temp = random.randint(1, num_troopers-2)
        hour_distribution = [[min_hours, temp], [max_hours, num_troopers-temp]]
    else:
        # Use linear algebra to solve the simultaneous equations
        # For instance:
        # 5x + 6y = total_hours
        # x + y = num_troopers
        A = np.array([[min_hours, max_hours], [1,1]])
        B = np.array([total_hours, num_troopers])

        
        result = np.linalg.solve(A, B)
        result = [round(x) for x in result]

        # essentially --> [[min_hours, result[0]], [max_hours, result[1]]]
        hour_distribution = list(zip([min_hours, max_hours], result))

    return total_hours, average_hours, hour_distribution


def print_timetable(timetable, duty_timings):
    ''' Creates a prettytable and prints timetable for debugging purposes'''
    timetable = deepcopy(timetable)
    table = PrettyTable()
    field_names = [x.strftime('%H%M') for x in duty_timings]
    field_names.insert(0, 'Trooper')
    table.field_names = field_names
    for trooper, duty in timetable.items():
        duty.insert(0, trooper)
        table.add_row(duty)
    
    print(table)


# TODO: Fix the None issue
# if doing first and last ==> random
# elif doing first only + ALL duty in morning block ==> morning and random
# elif doing last only + ALL duty in afternoon block ==> afternoon and random
# elif ALL duty falls in middle of the day + NOT doing first and last ==> late morning and random
# else: 
    # if completely empty ==> all possible
    # if all falls in morning ==> morning
    # if all falls in afternoon ==> afternoon (this and one above are ifs not elifs)

def find_all_available_shifts(timetable, duty_timings, troopers, min_hours=5):
    '''
    Analyses the timetable and assigns shifts for different troopers
    To assign 4 morning, 4 afternoon, 2 late morning, rest random
    for random, its filling in slots at the end

    stayout: either late afternoon/afternoon
    '''
    shift_blocks = {
        'morning': [time(6), time(12)],
        'late-morning': [time(8), time(14)],
        'afternoon': [time(10), time(17)]
    }

    def check_if_all_in_given_shift(shift_name, individual_timetable, shift_blocks=shift_blocks, duty_timings=duty_timings):
        '''
        check if all pre-assigned duties lie within a given shift. for eg, check if a timetable with some duties has been mapped
        out already for a person, then check if the duty lies within the shift provided in the function
        '''
        none_count = 0
        time_range = shift_blocks[shift_name]

        for duty_index in range(len(individual_timetable)):
            duty_timing = duty_timings[duty_index]
            duty_name = individual_timetable[duty_index]
            if duty_name != '': # if a duty is assigned
                if time_range[0] <= duty_timing and time_range[1] >= duty_timing: #if the duty lies in the range for the shift
                    if duty_name == None: # if the duty has been blocked out, increase the none count
                        none_count += 1
                else:
                    return False # return false if the duty falls out of the range of shift as this means because of this 1 duty it is not true that every single assigned duty lies in the shift
        
        shift_duration = int(time_range[1].strftime('%H')) - int(time_range[0].strftime('%H')) + 1
        if shift_duration - none_count >= min_hours:
            return True
        else:
            return False

    
    trooper_names = list(troopers.keys())
    #All troopers can have random shifts (shifts that dont follow a pattern)
    available_shifts = {}
    for trooper_name in trooper_names:
        # if the trooper is stayout and there is no pre assigned slots for the trooper, confirm should have afternoon shift
        if troopers[trooper_name]['status'] == 'stay-out' and len([duty for duty in timetable if duty is None]) == 0:
            available_shifts[trooper_name] = []
        else:
            available_shifts[trooper_name] = ['random']

    # if doing first and last ==> random
    # elif doing first only + ALL duty in morning block ==> morning and random
    # elif doing last only + ALL duty in afternoon block ==> afternoon and random
    # CANCELLED: # elif ALL duty falls in middle of the day + NOT doing first and last ==> late morning and random
    # else: 
        # if all falls in late morning ==> late morning
        # if all falls in morning ==> morning
        # if all falls in afternoon ==> afternoon (this and one above are ifs not elifs)    
    
    for trooper_name, individual_timetable in timetable.items():
        if individual_timetable[-2:] != [None, None] and individual_timetable[-2:] != ['', '']:
            doing_last = True
        else:
            doing_last = False
        
        #TODO: If SCA starts later to modify
        if 'SCA' in individual_timetable:
            timetable_range = individual_timetable[1:3]
        else:
            timetable_range = individual_timetable[:2]

        if timetable_range != [None, None] and timetable_range != ['', '']:
            doing_first = True
        else:
            doing_first = False
        
        if doing_first and doing_last:
            pass # is random
        elif doing_first and check_if_all_in_given_shift('morning', individual_timetable):
            available_shifts[trooper_name].append('morning')
        elif doing_last and check_if_all_in_given_shift('afternoon', individual_timetable):
            available_shifts[trooper_name].append('afternoon')
        else:
            # Cant assign morning shift for stayout personel
            if check_if_all_in_given_shift('morning', individual_timetable) and troopers[trooper_name]['status'] != "stay-out":
                available_shifts[trooper_name].append('morning')
            if check_if_all_in_given_shift('afternoon', individual_timetable):
                available_shifts[trooper_name].append('afternoon')
            # if check_if_all_in_given_shift('late-morning', individual_timetable):
            #     available_shifts[trooper_name].append('late-morning')

    return available_shifts


def determine_shift_distribution(troopers):
    if len(troopers) == 10:
        num_morning, num_afternoon, num_random = 4, 3, 3
    elif len(troopers) == 11:
        num_morning, num_afternoon, num_random = 4, 4, 3
    elif len(troopers) == 12:
        num_morning, num_afternoon, num_random = 4, 5, 3
    elif len(troopers) >= 13:
        num_morning, num_afternoon = 5, 5
        num_random = len(troopers) - 10
    
    return num_morning, num_afternoon, num_random


def select_shifts(possible_shifts, troopers, shift_blocks, shift_distribution):
    final_shifts = {
        'morning': set(),
        'afternoon': set(),
        'random': set()
    }

    shift_dict = {}
    all_troopers = set(troopers.keys())
    for trooper_name, trooper_shifts in possible_shifts.items():
        for shift in trooper_shifts:
            # If the person doesnt have a random shift this means that 
            # they are stayout personel
            # hence finalise their shift as afternoon
            if 'random' not in trooper_shifts:
                final_shifts[shift].add(trooper_name)

            if shift not in shift_dict:
                shift_dict[shift] = {trooper_name}
            else:
                shift_dict[shift].add(trooper_name)
    
    num_morning, num_afternoon, num_random = shift_distribution
    
    unique_morning = shift_dict['morning'] - shift_dict['afternoon'] - final_shifts['morning']
    unique_afternoon = shift_dict['afternoon'] - shift_dict['morning'] - final_shifts['afternoon']

    choice_of_morning_or_afternoon = shift_dict['morning'].intersection(shift_dict['afternoon'])

    print(unique_morning, unique_afternoon, choice_of_morning_or_afternoon)

    # if the sum of the difference between the needed and actual for both morning and afternoon is smaller than intersection, raise an error
    if num_morning>len(unique_morning) and num_afternoon>len(unique_afternoon) and (num_morning - len(unique_morning)) + (num_afternoon - len(unique_afternoon)) > len(choice_of_morning_or_afternoon):
        raise Exception('Unable to allocate shifts due to conflicts (requires _ morning, _afternoon to be available)')

    # To visualise the following code, draw a venn diagram with morning, afternoon 
    # and intersection being troopers that can do both shifts

    # Adding troopers if there is deficit
    # if the number of troopers that must have either morning/random shift is 
    # less than the number of morning shifts required top up the number of troopers
    # from those that can do both morning and afternoon
    if len(unique_morning) < num_morning - len(final_shifts['morning']):
        num_troopers_to_add = num_morning - len(final_shifts['morning']) - len(unique_morning)
        troopers_to_add = set(np.random.choice(list(choice_of_morning_or_afternoon), size=num_troopers_to_add, replace=False))

        choice_of_morning_or_afternoon = choice_of_morning_or_afternoon - troopers_to_add
        unique_morning.update(troopers_to_add)
        final_shifts['morning'].update(unique_morning)

    # Otherwise, pick from the entire pool of possible troopers
    elif len(unique_morning) >= num_morning - len(final_shifts['morning']):
        trooper_pool = choice_of_morning_or_afternoon
        trooper_pool.update(unique_morning)
        morning_shift = set(np.random.choice(list(trooper_pool), size=num_morning - len(final_shifts['morning']) , replace=False))
        final_shifts['morning'].update(morning_shift)

        choice_of_morning_or_afternoon = choice_of_morning_or_afternoon - morning_shift


    # Similar logic is applied for afternoon shift
    if len(unique_afternoon) < num_afternoon - len(final_shifts['afternoon']):
        num_troopers_to_add = num_afternoon - len(final_shifts['afternoon']) - len(unique_afternoon)
        troopers_to_add = set(np.random.choice(list(choice_of_morning_or_afternoon), size=num_troopers_to_add, replace=False))
        
        choice_of_morning_or_afternoon = choice_of_morning_or_afternoon - troopers_to_add
        unique_afternoon.update(troopers_to_add)
        final_shifts['afternoon'].update(unique_afternoon)


    # Now randomly select from remaining pool (choice_of_morning_or_afternoon and afternoon for eg)
    elif len(unique_afternoon) >= num_afternoon - len(final_shifts['afternoon']):
        trooper_pool = choice_of_morning_or_afternoon
        trooper_pool.update(unique_afternoon)
        afternoon_shift = set(np.random.choice(list(trooper_pool), size=num_afternoon - len(final_shifts['afternoon']), replace=False))
        final_shifts['afternoon'].update(afternoon_shift)

        choice_of_morning_or_afternoon = choice_of_morning_or_afternoon - afternoon_shift
    
    # All remaining troopers get assigned random shift
    final_shifts['random'] = all_troopers - final_shifts['morning'] - final_shifts['afternoon']
    
    
    for shift_type in final_shifts:
        final_shifts[shift_type] = list(final_shifts[shift_type])
        
    return final_shifts


# Unused function: manual is better and more randomised
def or_tools_select_shifts(possible_shifts, troopers, shift_blocks):
    shift_quota = {}
    if len(troopers) == 10:
        shift_quota['morning'] = 4
        shift_quota['afternoon'] = 3
        shift_quota['random'] = 3
        # num_morning, num_afternoon, num_random = 4, 3, 3
    elif len(troopers) == 11:
        shift_quota['morning'] = 4
        shift_quota['afternoon'] = 4
        shift_quota['random'] = 3
        # num_morning, num_afternoon, num_random = 4, 4, 3
    elif len(troopers) == 12:
        shift_quota['morning'] = 4
        shift_quota['afternoon'] = 5
        shift_quota['random'] = 3
        # num_morning, num_afternoon, num_random = 4, 5, 3
    elif len(troopers) >= 13:
        shift_quota['morning'] = 5
        shift_quota['afternoon'] = 5
        shift_quota['random'] = len(troopers) - 10
        # num_morning, num_afternoon = 5, 5
        # num_random = len(troopers) - 10

    shifts_list = list(shift_blocks.keys()) + ['random']
    troopers_list = list(troopers.keys())
    # troopers_list = list(troopers.keys())

    model = cp_model.CpModel()
    shifts = {}

    p = 0
    for trooper_name, trooper_possible_shifts in possible_shifts.items():
        trooper_possible_shifts = [shifts_list.index(shift_name) for shift_name in trooper_possible_shifts]
        for s in trooper_possible_shifts:
            shifts[(p,s)] = model.new_bool_var(f'shift_{p}_{s}')

        # Select exactly 1 shift for each person
        model.add_exactly_one([shifts[(p,s)] for s in trooper_possible_shifts])

        p += 1

    # Add shift quota for each type of shift
    for shift in shift_quota:
        s = shifts_list.index(shift)
        quota = shift_quota[shift]
        model.add(sum(shifts[(p,s)] for p in range(len(troopers)) if (p,s) in shifts) == quota)


    solver = cp_model.CpSolver()
    status = solver.solve(model)
    shift_dict = {}
    for shift in shifts_list:
        shift_dict[shift] = []

    if status in [cp_model.FEASIBLE, cp_model.OPTIMAL]:
        for p in range(len(troopers)):
            trooper_name = troopers_list[p]
            
            for s in range(len(shifts_list)):
                # Selects the chosen shift for the person
                # shifts_list[s] is the name of the shift with s index
                if (p,s) in shifts and solver.value(shifts[(p, s)]) == 1:
                    troopers[trooper_name]['shift'] = shifts_list[s]
                    shift_dict[shifts_list[s]].append(trooper_name)
                    # print(trooper_name, '-', shifts_list[s])
            
    return troopers, shift_dict
        
        



def get_all_roles_for_timeslot(timeslot, roles):
    '''
    Timeslot represents the hour of concern (eg time(13) represents the 13th hour of the day, ie from 1300 to 1400)
    '''
    timeslot_roles = []
    for role_name, role_dict in roles.items():
        if role_dict['timing'] == "whole-day" or timeslot in role_dict['timing']:
            timeslot_roles.append(role_name)
    
    return timeslot_roles


def get_occupied_roles_for_timeslot(timeslot, duty_timings, timetable):
    timeslot_roles = []
    troopers_on_duty = []
    timetable_index = duty_timings.index(timeslot)
    for trooper_name, individual_timetable in timetable.items():
        role = individual_timetable[timetable_index]
        if role != '' and role is not None:
            timeslot_roles.append(role)
            troopers_on_duty.append(trooper_name)
    
    return timeslot_roles, troopers_on_duty

def get_vacant_roles_for_timeslot(timeslot, roles, duty_timings, timetable):
    all_roles = get_all_roles_for_timeslot(timeslot, roles)
    occupied_roles = get_occupied_roles_for_timeslot(timeslot, duty_timings, timetable)[0]

    return list(set(all_roles) - set(occupied_roles))





def generate_duty_hours(troopers, duty_timings, shift_dict, roles):
    '''
    Adds duty hours to each trooper in the troopers dict, with reference to the
    shift type. If the person is doing afternoon shift then give more hours to 
    the 
    '''
    # Organising the afternoon shift
    afternoon_troopers = shift_dict['afternoon']
    random.shuffle(afternoon_troopers)

    total_hours, average_hours, hour_distribution = compute_hours(duty_timings, troopers, roles)
    temp_troopers = list(troopers.keys())
    # Recall hour distribution is like [(5,12), (6,1)]
    # Give afternoon troopers longer duty first, then morning troopers
    print(hour_distribution)

    # Recursive code to edit - basically you assign longer hours in the order: afternoon --> random --> morning
    # TODO: EDIT THIS CODE
    for i in range(hour_distribution[1][1]):
        if i < len(afternoon_troopers):
            long_duty_trooper = afternoon_troopers[i]
        else:
            index = i - len(afternoon_troopers)
            if index < len(shift_dict['random']):
                long_duty_trooper = shift_dict['random'][index]
            else:
                index2 = index - len(shift_dict['random'])
                long_duty_trooper = shift_dict['morning'][index2]

            
        
        troopers[long_duty_trooper]['assigned_hours'] = hour_distribution[1][0]
        temp_troopers.remove(long_duty_trooper)

    for trooper in temp_troopers:
        troopers[trooper]['assigned_hours'] = hour_distribution[0][0]

    return troopers


def assign_sentry_duty(troopers, timetable, roles):
    combat_troopers = []
    for trooper in troopers:
        trooper_dict = troopers[trooper]
        if trooper_dict['type'] == 'combat':
            combat_troopers.append(trooper)

    for role in roles:
        if role == 'sentry':
            combat_count = len(combat_troopers)
            if combat_count == 4:
                hour_distribution = [3,3,3,3]
            elif combat_count == 5:
                hour_distribution = [3,2,2,2,3]
            # sentry is minimum 2h so just choose 6 people to do it if cannot
            else:
                hour_distribution = [2,2,2,2,2,2]

            shuffled_combat = random.sample(combat_troopers, combat_count)

            j = 0
            for i in range(len(hour_distribution)):
                selected_trooper = shuffled_combat[i]
                block_length = hour_distribution[i]

                for k in range(block_length):
                    timetable[selected_trooper][j] = 'sentry'
                    # troopers[selected_trooper]['hours'] += 1
                    j += 1            

    return timetable


# class VarArraySolutionPrinter(cp_model.CpSolverSolutionCallback):
#     """Print intermediate solutions."""

#     def __init__(self, variables: list[cp_model.IntVar]):
#         cp_model.CpSolverSolutionCallback.__init__(self)
#         self.__variables = variables
#         self.__solution_count = 0

#     def on_solution_callback(self) -> None:
#         self.__solution_count += 1
#         for v in self.__variables:
#             for b in v:
#                 print(f"{b}={self.value(b)}", end=" ")

#     @property
#     def solution_count(self) -> int:
#         return self.__solution_count



def or_tools_shift_scheduling(troopers, duty_timings, timetable, roles, shift_blocks):
    num_troopers = len(troopers)
    num_hours = len(duty_timings)
    all_troopers = range(num_troopers)
    all_hours = range(num_hours)

    timetable_keys = list(timetable.keys())

    model = cp_model.CpModel()
    duties = {}
    visualiser = {}

    for p in range(5):
        for t in range(8):
            visualiser[(p,t)] = random.randint(0, 1)

    for p in all_troopers:
        trooper = timetable_keys[p]

        for t in all_hours:
            duties[(p, t)] = model.new_bool_var(f"duty_p{p}_t{t}")
            

            timing = duty_timings[t]

            # Assign no slot for None values in timetable
            if timetable[trooper][t] is None:
                model.add(duties[(p, t)] == 0)

            # Mark slot as taken if filled with anything else
            # TODO: 
            elif timetable[trooper][t] != '':
                model.add(duties[(p, t)] == 1)
        

        # For morning and afternoon shift: if the timing falls out of the timerange, make sure slot cant be filled by anything else
        assigned_shift = troopers[trooper]['shift']
        if assigned_shift != 'random':
            shift_duration = shift_blocks[assigned_shift]
            starting_index = duty_timings.index(shift_duration[0])
            ending_index = duty_timings.index(shift_duration[1])


            blank_timings = list(range(num_hours))
            blank_timings[starting_index: ending_index+1] = []

            # Mark these timings as 0 so that they cant be assigned duty for out of their shift (eg assigned afternoon slots when they are acutally morning)
            for timing in blank_timings:
                model.add(duties[(p, timing)] == 0)

            # for those that start at 11am try to give lunch break before 3pm, if cannot then ⁠give desk
            # possible time slots: 11-12, 12-1, 1-2, 2-3
            # In other words, must give someone doing a straight during lunch break (from 11am-3pm straight) 1h break for lunch
            lunch_timings = [time(11), time(12), time(13), time(14)]
            lunch_timing_indices = [duty_timings.index(timing) for timing in lunch_timings]

            # only enforce if all are true (ie all are 1)
            model.add(sum(duties[(p, t)] for t in lunch_timing_indices) == 1).only_enforce_if([duties[(p,t)] for t in lunch_timing_indices])

        
            


    # Sets the number of roles to be filled 
    for t in all_hours:
        num_roles = len(get_all_roles_for_timeslot(duty_timings[t], roles))

        model.add(sum(duties[(p, t)] for p in all_troopers) == num_roles)
        # print(t, sum(visualiser[(p,t)] for p in all_troopers))
    # model.add(duties[(0,0)] == 1)

    
    # Sets the number of hours per trooper to be filled
    for p in all_troopers:
        trooper_name = timetable_keys[p]
        assigned_hours = troopers[trooper_name]['assigned_hours']
        # print(assigned_hours)

        model.add(sum(duties[(p, t)] for t in all_hours) == assigned_hours)

    
        # Set condition whereby first and last are all 2 hours (adding implication to prevent only half of first or last to be filled)
        model.add_implication(duties[p, num_hours-1], duties[p, num_hours-2])
        model.add_implication(duties[p, 0], duties[p, 1])

        # Set condition for SCA 
        model.add_implication(duties[p, 1], duties[p, 2]).only_enforce_if(~duties[p, 0])

    # Penalise based on single breaks in schedule or double breaks
    model.minimize(sum(2 for p in all_troopers for t in range(num_hours-1) if duties[p,t] != duties[p, t+1])\
                   + sum(1 for p in all_troopers for t in range(num_hours-3) if duties[p,t] != duties[p, t+1] and duties[p,t+1] == duties[p, t+2] and duties[p, t] == duties[p, t+3]))
                    # + sum(1 for p in all_troopers for t in range(num_hours-3) if duties[p,t] != duties[p, t+3])\
                    #  + sum(1 for p in all_troopers for t in range(num_hours-4) if duties[p,t] != duties[p, t+4]))
    
    
    # pprint.pprint(visualiser)
    # print(sum(5 for p in range(5) for t in range(8-1) if visualiser[p,t] != visualiser[p, t+1])\
    #                + sum(4 for p in range(5) for t in range(8-2) if visualiser[p,t] != visualiser[p, t+2] and visualiser[p,t] != visualiser[p, t+1]))
    #                 # + sum(1 for p in range(5) for t in range(8-3) if visualiser[p,t] != visualiser[p, t+3])\
    #                 #  + sum(1 for p in range(5) for t in range(8-4) if visualiser[p,t] != visualiser[p, t+4]))
    
    
    # Set up the objective function: minimising the number of gaps in schedule
    # cost = 0
    # for p in all_troopers:
    #     test_list = list(visualiser[(p, t)] for p in all_troopers for)
        
        # res = [test_list[i] for i in range(0, len(test_list)) 

        

    # model.export_to_file('bling2.txt')

    solver = cp_model.CpSolver()
    status = solver.solve(model)

    if status in [cp_model.FEASIBLE, cp_model.OPTIMAL]:
        for p in all_troopers:
            trooper = timetable_keys[p]
            for t in all_hours:
                optimal_value = solver.value(duties[(p, t)])
                timetable_value = timetable[trooper][t]

                if timetable_value == '' and optimal_value == 1:
                    timetable[trooper][t] = 'TODO'
    else:
        raise TimetableInputError('Unable to generate duty timeslots. Modify the timetable input and morning/afternoon shift timings once again')
            
    return timetable

def or_tools_role_assignment(troopers, duty_timings, timetable, roles, last_standing_index):
    num_troopers = len(troopers)
    num_hours = len(duty_timings)
    all_troopers = range(num_troopers)
    all_hours = range(num_hours)

    roles_keys = list(roles.keys())
    timetable_keys = list(timetable.keys())
    troopers_keys = list(troopers.keys())

    # Description of model:
    # Each occupied duty is assigned an integer variable that ranges from 0 to the number of roles that are present in that hour - 1
    # For example, if there are 5 roles then the domain will be from 0 to 4
    # Within 1 timeslot, all duties must be distinct (since each duty is only performed by 1 person)
    # The subsequent duty must be different than the preceding (ie 2 duties in a row shouldnt be the same)
    # Optimisation function: Maximise variety of duty (or duty requests? TODO)

    model = cp_model.CpModel()
    assigned_duties = {}
    for t in all_hours:
        all_roles = [roles_keys.index(role) for role in get_all_roles_for_timeslot(duty_timings[t], roles)]
        num_roles = len(all_roles)
        selected_trooper_indices = []
        
        for p in all_troopers:
            trooper_name = timetable_keys[p]
            current_duty = timetable[trooper_name][t]
            if current_duty is not None and current_duty != '':
                # Create integer model variables for each selected shift
                domain_1 = cp_model.Domain.from_values(all_roles)
                assigned_duties[(p,t)] = model.new_int_var_from_domain(domain_1, f"duties_{p}_{t}")
                selected_trooper_indices.append(p)   
                
                # if t==1 or t==num_hours-1:
                #     model.add(assigned_duties[(p,t)] == assigned_duties[(p,t-1)])
                

                # Fix the duties that have been preselected
                if current_duty in roles_keys:
                    role_index = roles_keys.index(current_duty)
                    model.add(assigned_duties[(p,t)] == role_index)

        
        # Set constraint such that during each timeslot the duties assigned is all different
        # This means that the integer value assigned to each shift is unique
        combinations = list(itertools.combinations(selected_trooper_indices, r=2))
        for combination in combinations:
            trooper_1 = combination[0]
            trooper_2 = combination[1]
            model.add(assigned_duties[trooper_1, t] != assigned_duties[trooper_2, t])        


    counter = 1
    to_update = []
    for p in all_troopers:
        # Set the first duty and last duty to be same across the first and last 2 timeshifts respectively
        # First duty:
        if (p,2) in assigned_duties.keys() and (p,1) in assigned_duties.keys() and (p,0) not in assigned_duties.keys():
            model.add(assigned_duties[(p,1)] == roles_keys.index(f'SCA{counter}'))
            model.add(assigned_duties[(p,1)] == assigned_duties[(p,2)])
            to_update.extend([(p,1), (p,2)])
            counter += 1

        if (p,0) in assigned_duties.keys() and (p,1) in assigned_duties.keys():
            model.add(assigned_duties[(p,1)] == assigned_duties[(p,0)])
        
        # Last duty
        if (p, num_hours-1) in assigned_duties.keys():
            model.add(assigned_duties[(p,num_hours-2)] == assigned_duties[(p,num_hours-1)])


        # Set the constraint that if someone does both first and last duty, they dont get the same (eg first and last x-ray)            
        if (p, 1) in assigned_duties.keys() and (p, num_hours-1) in assigned_duties.keys():
            model.add(assigned_duties[(p,1)] != assigned_duties[(p,num_hours-1)])

    

    # Prevent consecutive duties from being the same    
    sorted_keys = list(assigned_duties.keys())
    sorted_keys.sort(key=lambda elem: elem[0])
    
    for i in range(len(sorted_keys)-1):
        p,t = sorted_keys[i]
        next_p, next_t = sorted_keys[i+1]

        # If the next duty is consecutive to the current
        # Add a constraint that they arent the same duty
        if p == next_p:
            current_duty = timetable[timetable_keys[p]][t]
            next_duty = timetable[timetable_keys[next_p]][next_t]

            if 'TODO' in [current_duty, next_duty] and t not in [0, num_hours-2] and 'sentry' not in [current_duty, next_duty] and (p,t) not in to_update and (next_p, next_t) not in to_update:
                model.add(assigned_duties[p, t] != assigned_duties[next_p, next_t])
            
    
    # Cannot 3 hours standing consecutively
    # add implication that if there are 2 standing in a row then the 3rd one must be sitting
    # the split between sitting and standing happens at index 3 (>=3 is sitting, <3 is standing)
    counter = 0
    for i in range(len(sorted_keys)-2):
        first_p,first_t = sorted_keys[i]
        second_p, second_t = sorted_keys[i+1]
        third_p, third_t = sorted_keys[i+2]
        
        temp_vars = {}
        if first_p == second_p == third_p and third_t-second_t == second_t-first_t == 1:
            counter += 1
            temp_vars[counter, 1] = model.new_bool_var(f"consec_{counter}_0_{first_p}")
            temp_vars[counter, 2] = model.new_bool_var(f"consec_{counter}_1_{first_p}")

            # Implement consec
            # https://developers.google.com/optimization/cp/channeling
            # last standing index was 3 last time with no 2 new scas
            model.add(assigned_duties[first_p, first_t] <= last_standing_index).only_enforce_if(temp_vars[counter, 1])
            model.add(assigned_duties[first_p, first_t] > last_standing_index).only_enforce_if(~temp_vars[counter, 1])

            model.add(assigned_duties[second_p, second_t] <= last_standing_index).only_enforce_if(temp_vars[counter, 2])
            model.add(assigned_duties[second_p, second_t] > last_standing_index).only_enforce_if(~temp_vars[counter, 2])

            model.add(assigned_duties[third_p, third_t] > last_standing_index).only_enforce_if([temp_vars[counter, 1], temp_vars[counter, 2]])



    # model.export_to_file('assign.txt')
    solver = cp_model.CpSolver()
    status = solver.solve(model)

    if status in [cp_model.FEASIBLE, cp_model.OPTIMAL]:
        for assignment_tuple, role_index in assigned_duties.items():
            trooper_name = troopers_keys[assignment_tuple[0]]
            role_assigned = roles_keys[solver.value(role_index)]
            timetable[trooper_name][assignment_tuple[1]] = role_assigned
    
    else:
        raise TimetableInputError("Unable to assign specific duties. Check the duty timeslots and try again")

    return timetable
        

def add_allocated_shift_to_troopers_dict(allocated_shifts, troopers):
    for shift_name in allocated_shifts:
        for trooper_name in allocated_shifts[shift_name]:
            troopers[trooper_name]['shift'] = shift_name

    return troopers

def allocate_miscellaneous_roles(all_troopers, timetable):
    '''
    Miscellaneous roles are:
    - flag raising/lowering personel
    - person drawing breakfast 
    - person drawing dinner
    - last ensurer

    This function determines these people and returns it in that order
    '''
    # Determine flag troopers
    possible_flag_troopers = []
    for trooper_name in all_troopers:
        trooper_info = all_troopers[trooper_name]
        if trooper_info['present'] and not trooper_info['excuse_rmj']:
            possible_flag_troopers.append(trooper_name)
    
    flag_troopers = random.sample(possible_flag_troopers, 3)

    #  breakfast and dinner is first and last out respectively
    #  in the case where its stayout or rf then IN gate will take
    for trooper_name, duty in timetable.items():
        if duty[0] == 'out':
            first_out = trooper_name
        if duty[len(duty)-1] == 'out':
            last_out = trooper_name

        if duty[0] == 'in':
            first_in = trooper_name
        if duty[len(duty)-1] == 'in':
            last_in = trooper_name

    if all_troopers[first_out]['permanent'] and all_troopers[first_out]['status'] == 'stay-in':
        breakfast = first_out
    else:
        breakfast = first_in
    
    # print(all_troopers[last_out])
    if all_troopers[last_out]['permanent'] and all_troopers[last_out]['status'] == 'stay-in':
        dinner = last_out
    else:
        dinner = last_in

    # Determine last ensurer
    temp_troopers = []
    for trooper_name in all_troopers:
        trooper_info = all_troopers[trooper_name]
        if trooper_info['present'] and trooper_info['status'] != "stay-out":
            temp_troopers.append(trooper_name)

    temp_troopers.remove(breakfast)
    temp_troopers.remove(dinner)

    last_ensurer = random.choice(temp_troopers)
        

    return flag_troopers, breakfast, dinner, last_ensurer



def generate_filename(timetable_type, timetable_date):
    '''
    timetable_type(str): A value that indicates if it is normal duty or OC duty
    '''
    previous_monday = timetable_date + relativedelta(weekday=MO(-1))
    previous_monday = previous_monday.strftime("%d%m%y")

    if timetable_type == "OC":
        return f"Week of {previous_monday}.xlsx"
    elif timetable_type == "normal":
        return f"Normal Week of {previous_monday}.xlsx"


def create_excel(filename, all_troopers, timetable, duty_timings, flag_troopers, breakfast, dinner, last_ensurer, today=datetime.date.today() + datetime.timedelta(days=1)):
    # Convert all None to empty string
    for trooper_name, duties in timetable.items():
        for i in range(len(duties)):
            if duties[i] is None:
                timetable[trooper_name][i] = ''

    # TODO
    duty_timings2 = [time(x) for x in range(7, 19)]
    
    Path("timetables").mkdir(exist_ok=True)
    workbook = xlsxwriter.Workbook(filename)

    
    worksheet = workbook.add_worksheet()

    cell_format_dict = {'bold': True, 'italic': True, 'font_name': 'Arial', 'align': 'center'}
    merged_format_dict = {'bold': True, 'italic': True, 'font_name': 'Arial', 'align': 'center', 'font_size': 10}

    colors = {
        'first_row': '#fce5cd',
        'out': '#ff9900',
        'in': '#ffff00',
        'x-ray': '#00ffff',
        'desk': '#00ff00',
        'SCA1': '#ff00ff',
        'SCA2': '#ff00ff',
        'SCA3': '#ff00ff',
        'SCA4': '#ff00ff',
        'PAC': '#f4cccc',
        'sentry': '#ff0000',
        'absent': '#999999'
    }

    colors_format = {}
    for key in colors:
        merged_cell_format = workbook.add_format(merged_format_dict)
        if key == 'first_row':
            # Add default merge formatting (blank periods)
            colors_format[''] = merged_cell_format
        else:
            if key != 'absent':
                merged_cell_format.set_border()
            merged_cell_format.fg_color = colors[key]
            colors_format[key] = merged_cell_format

    cell_format = workbook.add_format(cell_format_dict)
    timings_cell_format = workbook.add_format(merged_format_dict)
    trooper_name_cell_format = workbook.add_format(cell_format_dict)
    timings_cell_format.set_border()
    trooper_name_cell_format.set_border()
    


    table_length = len(duty_timings) + 2
    # Set column widths
    worksheet.set_column(0, 0, 14)
    worksheet.set_column(table_length-1, table_length-1, 13)
    worksheet.set_column(1, table_length-2, 12)

    # Create the first row
    first_row_format = workbook.add_format(cell_format_dict)
    first_row_format.set_fg_color(colors['first_row'])
    worksheet.merge_range(0, 0, 0, table_length-1, f'DUTY {today.strftime("%d%m%y %A")}'.upper(), first_row_format) 

    # Add the timings
    # i+1 since the first column is empty
    for i in range(len(duty_timings)):
        worksheet.write(1, i+1, duty_timings[i].strftime('%H%M') + '-' + duty_timings2[i].strftime('%H%M'), timings_cell_format)



    # Style the leftmost and rightmost square
    worksheet.write(1, 0, '', trooper_name_cell_format)
    worksheet.write(1, table_length-1, 'HOURS', colors_format['out'])

    # Add the duties
    row = 2
    col = 0
    trooper_count = 0
    # for trooper_name, duties in timetable.items():
    for trooper_name in all_troopers:
        trooper_count += 1

        # First column: name
        worksheet.write(row, col, trooper_name.upper(), trooper_name_cell_format)

        # Add duties for a present trooper
        if all_troopers[trooper_name]['present'] is True:
            duties = timetable[trooper_name]

            # Last column: hours
            num_hours = sum([1 for x in duties if x is not None and x != ''])

            # From 2nd to before last column: add duties
            duty_index = 0
            merged_cell_length = 0

            # Append a random element to the end of list to allow for comparison of the last 2
            duties.append('sdfs')

            # Keep checking for consecutive duties until you reach the last element of the list
            while duty_index <= len(duties) - 2:
                merged_cell_length = 1
                if duties[duty_index] != '' and duties[duty_index] is not None:
                    # keep incrementing if adjacent elements are the same
                    while duties[duty_index] == duties[duty_index + 1]:
                        merged_cell_length += 1
                        duty_index += 1
                
                # Merge same duties if theres consecutive duties
                if merged_cell_length > 1:
                    merge_start = duty_index - merged_cell_length + 2
                    merge_end = duty_index + 1
                    worksheet.merge_range(row, merge_start, row, merge_end, duties[duty_index].upper(), colors_format[duties[duty_index]])
                
                # Otherwise just use write method and dont merge
                else:
                    worksheet.write(row, duty_index + 1, duties[duty_index].upper(), colors_format[duties[duty_index]])
                
                duty_index += 1

            # Remove the random last element
            duties.pop()

        # If trooper is absent
        else:
            num_hours = 0
            worksheet.merge_range(row, 1, row, table_length-2, all_troopers[trooper_name]['reason_for_absence'], colors_format['absent'])

        # Add last column: hours
        worksheet.write(row, table_length-1, num_hours, colors_format['out'])


        # Add styling and progress to the next trooper for every trooper except the last
        if trooper_count <= len(all_troopers) - 1:
            # Add a cell with plain border for alternating rows (styling of the rows in between)
            row += 1
            worksheet.write(row, 0, '', trooper_name_cell_format)
            worksheet.write(row, table_length-1, '', colors_format['out'])

        # Go to the next row to continue printing out the next trooper duties
        row += 1

    # STYLING BOTTOM ROW
    # flag_troopers, breakfast, dinner, last_ensurer = allocate_miscellaneous_roles(all_troopers, timetable)

    flag_text = 'FLAG:' + ' // '.join([trooper_name.upper() for trooper_name in flag_troopers])


    bottom_row_side_cell_format = workbook.add_format({'bold': True, 'italic': True, 'font_name': 'Arial', 'align': 'center', 'valign': 'bottom', 'fg_color': '#00ff00', 'border': 1})
    worksheet.merge_range(row, 0, row+2, 2, flag_text, bottom_row_side_cell_format)
    worksheet.merge_range(row, table_length-4, row+2, table_length-1, f'LAST ENSURER: {last_ensurer.upper()}', bottom_row_side_cell_format)

    bottom_row_middle_cell_format = workbook.add_format({'bold': True, 'italic': True, 'font_name': 'Arial', 'align': 'center', 'valign': 'bottom', 'font_color': '#ff0000', 'border': 1})
    worksheet.merge_range(row, 3, row+2, 9, f'BREAKFAST:{breakfast.upper()} // DINNER:{dinner.upper()}', bottom_row_middle_cell_format)
    workbook.close()


def main_scheduling():
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
            'timing': 'whole-day'
        },

        'out': {
            'duration': [1],
            'timing': 'whole-day'
        },

        'SCA1': {
            'duration': [1],
            'timing': [time(7), time(8)]
        },

        'SCA2': {
            'duration': [1],
            'timing': [time(7), time(8)]
        },

        'sentry': {
            'duration': [2, 3],
            'timing': 'whole-day'
        },

        'x-ray': {
            'duration': [1],
            'timing': 'whole-day'
        },


        'desk': {
            'duration': [1],
            'timing': 'whole-day'
        },

        'PAC': {
            'duration': [2],
            'timing': [time(16), time(17)]
        }
    }
    
    shift_blocks = {
        'morning': [time(6), time(13)],
        # 'late-morning': [time(8), time(14)],
        'afternoon': [time(10), time(17)]
    }

    # GENERATE EMPTY TIMETABLE
    timetable = {}
    for trooper in troopers:
        timetable[trooper] = ['' for j in range(len(duty_timings))]
    
    # previous_saved_state = deepcopy(timetable)

    timetable = assign_sentry_duty(troopers, timetable, roles)
    print_timetable(timetable, duty_timings)

    # regenerate_sentry = input("\nRegenerate sentry? (y/n)")
    # while regenerate_sentry == 'y':
    #     timetable = deepcopy(previous_saved_state)
    #     assign_sentry_duty(troopers, timetable, roles)
    #     print_timetable(timetable, duty_timings)
    #     regenerate_sentry = input("\nRegenerate sentry? (y/n)")


    ### TIMETABLE TESTING
    # timetable['dhruva'][0:2] = ['desk'] * (2-0)
    # timetable['dhruva'][4] = 'x-ray'
    # timetable['dhruva'][5] = None

    ## Trial
    # timetable['dhruva'][1:3] = ['SCA1', 'SCA1']
    # timetable['marc'][1:3] = ['SCA2', 'SCA2']
    # timetable['xavier'][3:6] = ['sentry', 'sentry', 'sentry']
    # timetable['kah fai'][6:9] = ['sentry', 'sentry', 'sentry']
    # timetable['tan di er'][9:12] = ['sentry', 'sentry', 'sentry']
    # timetable['marc'][10:12] = ['PAC', 'PAC']
    # timetable["syafi'i"][10:12] = ['x-ray', 'x-ray']
    # timetable['kah fai'][10:12] = ['out', 'out']
    # timetable['aniq'][10:12] = ['desk', 'desk']
    timetable['hilmi'][0:6] = ['desk', 'desk', 'out', 'x-ray', 'out', 'desk']


    # timetable['xavier'][0:2] = ['in'] * (2-0)
    # timetable['xavier'][10:12] = ['out'] * (12-10)
    # timetable['xavier'][6] = 'x-ray'
    # timetable['jun'][6:11] = [None] * (11-6)
    # timetable['hilmi'][0:2] = ['SCA2'] * (2-0)
    # timetable['aniq'][0:2] = ['out'] * (2-0)
    # timetable['aniish'][0:2] = ['x-ray'] * (2-0)
    


    # ### Shift testing
    # troopers['dhruva']['shift'] = 'morning'
    # troopers['jun']['shift'] = 'random'
    # troopers['aniish']['shift'] = 'morning'
    # troopers['hilmi']['shift'] = 'morning'
    # troopers['syaffi']['shift'] = 'afternoon'
    # troopers['kah fai']['shift'] = 'afternoon'
    # troopers['ashmit']['shift'] = 'morning'
    # troopers['di er']['shift'] = 'random'
    # troopers['marc']['shift'] = 'afternoon'
    # troopers['joshua']['shift'] = 'afternoon'
    # troopers['xavier']['shift'] = 'morning'
    # troopers['aniq']['shift'] = 'random'
    # troopers['hakim']['shift'] = 'afternoon'


    # 5 morning, 5 afternoon, 1 late morning, 2 random
    total_hours, average_hours, hour_distribution = compute_hours(duty_timings, troopers, roles)
    print(compute_hours(duty_timings, troopers, roles))

    print_timetable(timetable, duty_timings)

    available_shifts = find_all_available_shifts(timetable, duty_timings, troopers)
    # pprint.pprint(available_shifts)

    shift_distribution = determine_shift_distribution(troopers)
    allocated_shifts = select_shifts(available_shifts, troopers, shift_blocks, shift_distribution)
    pprint.pprint(allocated_shifts)

    # allocated_shifts = json.loads(input('Enter the finalised shifts'))

    troopers = generate_duty_hours(troopers, duty_timings, allocated_shifts, roles)
    troopers = add_allocated_shift_to_troopers_dict(allocated_shifts, troopers)

    # troopers, allocated_shifts = or_tools_select_shifts(possible_shifts, troopers, shift_blocks)
    # pprint.pprint(allocated_shifts)
    # generate_duty_hours(troopers, timetable, duty_timings, allocated_shifts, roles)

    
   

    
    # pprint.pprint(troopers)



    timetable = or_tools_shift_scheduling(troopers, duty_timings, timetable, roles, shift_blocks)
    print_timetable(timetable, duty_timings)

    timetable = or_tools_role_assignment(troopers, duty_timings, timetable, roles, 3)
    print_timetable(timetable, duty_timings)
    # print(get_all_roles_for_timeslot(time(17), roles))
    # print(get_occupied_roles_for_timeslot(time(17), duty_timings, timetable))
    # print(get_vacant_roles_for_timeslot(time(17), roles, duty_timings, timetable))


    # allocated_shifts = allocate_shifts()

    # generate_duty_hours(troopers, timetable, duty_timings, shift_blocks)
    # print_timetable(timetable, duty_timings)
    
    print(allocate_miscellaneous_roles(all_troopers, timetable))
    flag_troopers, breakfast, dinner, last_ensurer = allocate_miscellaneous_roles(all_troopers, timetable)
    create_excel('trial.xlsx', all_troopers, timetable, duty_timings, flag_troopers, breakfast, dinner, last_ensurer)


if __name__ == "__main__":
    main_scheduling()