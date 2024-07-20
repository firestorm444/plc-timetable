# PLC Timetable
This project is a timetable generator that aims to make daily timetable generation faster and more efficient for troopers to use in ...


# Step _ : Generate duty timeslots (but not filled with specific duties)
This uses OR-tools to generate a feasible timetable where the duty timeslots are determined. For each trooper and timeslot, a boolean variable is generated in the model - if the value is 0 then the trooper is not having duty, and if the value is 1 then the trooper is having duty.

`duties[(p, t)] = model.new_bool_var(f"duty_p{p}_t{t}")`
where p is the trooper and t is the timeslot for every trooper and every timeslot

## Constraints

### Predetermined duty should be filled in 
```
if timetable[trooper][t] is None:
    model.add(duties[(p, t)] == 0)

elif timetable[trooper][t] != '':
    model.add(duties[(p, t)] == 1)
```
if timetable is marked with a None, set the variable to zero and if a duty has already been assigned, then set variable to one

### A trooper should not do duty out of their assigned shift
If a trooper is doing morning shift (eg 6am - 1pm), they should not get duty out of their shift (eg at 2pm). This applies if they are assigned specific shifts (eg morning/afternoon)

### A trooper should get a lunch break (1h break) from 11am-3pm if they are doing straight duty with no breaks

### There should be n duties filled per timeslot where n is the number of roles
`model.add(sum(duties[(p, t)] for p in all_troopers) == num_roles)`  
For example if there are 5 duties ()