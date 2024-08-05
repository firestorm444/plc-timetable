// Default parameters to send:
// roles, shift_blocks, num_morning, num_afternoon, num_random, timetable_date


document.addEventListener('DOMContentLoaded', async function() {
    var allShifts = ['morning', 'afternoon', 'random'];
    var selectAndDragEvents = null;
    var selectAndDragStart, selectAndDragEnd

    // Get default parameters from python and set the timetable date
    var defaultParameters = await eel.get_default_parameters()();
    var trooperKeys = defaultParameters.trooper_keys;
    var timetableDate = new Date(defaultParameters.timetable_date);
    var resources = await eel.convert_troopers_to_calendar_resources()();

    // Set up morning & afternoon ending/starting times and the number of troopers doing both
    let numMorningInput = document.querySelector('#morning-shift-num');
    let numAfternoonInput = document.querySelector('#afternoon-shift-num');
    let morningEndingTime = document.querySelector('#morning-ending-time');
    let afternoonStartingTime = document.querySelector('#afternoon-starting-time')

    numMorningInput.value = defaultParameters.shift_distribution[0];
    numAfternoonInput.value = defaultParameters.shift_distribution[1];
    morningEndingTime.value = defaultParameters.shift_blocks.morning[1];
    afternoonStartingTime.value = defaultParameters.shift_blocks.afternoon[0];

    // Manage calendar history - undo and redo
    var undoStack = [];
    var redoStack = [];
    var undoTwice = false;

    // Set up step history stack which is the record of the states of the different steps
    var stepHistoryStack = [[]];

    function undo() {
        if (undoStack.length == 1) {
            return undoStack[0]
        }
        let element = undoStack.pop();
        redoStack.push(element);
        undoTwice = false;
        return element
    }

    function redo() {
        if (redoStack.length == 1) {
            return redoStack[0]
        }
        let element = redoStack.pop();
        undoStack.push(element)
        undoTwice = false
        return element
    }

    // Set up calendar on update from backend
    function setNewCalendarEvents(newEvents, oldEvents=calendar.getEvents()) {
        calendar.batchRendering(function () {
            oldEvents.forEach(event => {
                event.remove()
            });
            
            newEvents.forEach(event => {
                calendar.addEvent(event)
            });
        })
    }

    // Set up draggable elements
    let counter = 0;
    let fullCalendarDraggables = []
    let draggableContainer = document.querySelector('.draggable-container')
    for (const role in defaultParameters.roles) {
        const roleObject = defaultParameters.roles[role];
        if (role == 'None' || role == 'TODO') {
            var eventTitle = roleObject.name
        } else {
            var eventTitle = role
        }

        // Create a new draggable element
        let draggableElement = document.createElement('div');
        draggableElement.classList.add('draggable');
        draggableElement.style.backgroundColor = roleObject.color;
        draggableElement.innerText = eventTitle;

        draggableContainer.appendChild(draggableElement);

    
        // Link draggable element to fullcalendar
        fullCalendarDraggables[counter] = new FullCalendar.Draggable(draggableElement, {
            eventData: {
                title: eventTitle,
                duration: '01:00',
                color: roleObject.color,
                borderColor: 'black',
            }
        })
    }

    var calendarEl = document.getElementById('calendar');
    
    // EXAMPLE OF DRAGABBLE FORMAT
    // var draggableE1 = document.querySelector('.draggable');
    // let draggable = new FullCalendar.Draggable(draggableE1, {
    //     eventData: {
    //     title: 'my event',
    //     duration: '02:00',
    //     color: 'purple'
    //     }
    // });

    // Set up Calendar
    var calendar = new FullCalendar.Calendar(calendarEl, {
        schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
        initialView: 'resourceTimelineDay',
        editable: true,
        droppable: true,
        selectable: true,
        dragRevertDuration: 0,
        slotDuration: '01:00:00',
        slotMinTime: "06:00:00",
        slotMaxTime: "18:00:00",
        eventTextColor: "black",
        height: "auto",
        initialDate: timetableDate,
        headerToolbar: {
            start: 'title',
            center: '',
            end: ''
        },
        resources: resources,
        // EXAMPLE OF RESOURCES FORMAT
        // resources: [
        //   {
        //       id: "1",
        //       title: "Dhruva",
        //       extendedProps: {
        //         hours: '5',
        //         possibleShifts: ['morning', 'afternoon', 'random']
        //       }
        //   },
        //   {
        //       id: "2",
        //       title: "Mark",
        //       extendedProps: {
        //         hours: '0',
        //         possibleShifts: ['morning', 'random']
        //       }
        //   }
        // ],
        
        resourceAreaColumns: [
        {
            field: 'title',
            headerContent: 'Trooper'
        },

        {
            headerContent: 'Hours',
            cellContent: function(arg) {
                var extendedProps = arg.resource.extendedProps;
                var hours = extendedProps.hours
                
                var z = document.createElement('input');
                z.classList.add('hours-input')
                z.value = hours;
                z.type = 'number';
                z.style.width = '40px';
                z.style.alignSelf = 'center';
                z.id = `hours_${arg.resource.id}`

                let arrayOfDomNodes = [z];
                return { domNodes: arrayOfDomNodes}
            }
        },

        {
            headerContent: 'Shift',
            cellContent: function(arg) {
                var extendedProps = arg.resource.extendedProps;
                var possibleShifts = extendedProps.possibleShifts

                // Create select object
                var shiftSelect = document.createElement('select');
                shiftSelect.classList.add('shift-select');
                shiftSelect.id = `shifts_${arg.resource.id}`;

                for (let index = 0; index < allShifts.length; index++) {
                    var shift = allShifts[index];
                    var shiftOption = document.createElement('option');
                    shiftOption.text = shift;
                    // if (possibleShifts.includes(shift)) {
                    //     shiftOption.disabled = false
                    // } else {
                    //     shiftOption.disabled = true
                    // }
                    shiftSelect.add(shiftOption)  
                }
                return {domNodes: [shiftSelect]}
            }
        }
        ],
        // events: await eel.convert_timetable_to_calendar_events()(),
        events: [],
        // EXAMPLE OF EVENTS FORMAT
        // events: [
        //   {
        //     resourceId: '1',
        //     title: 'sentry',
        //     start: '2024-07-20 16:00',
        //     end: '2024-07-20 17:00',
        //   },

        //   {
        //     // id: '1',
        //     resourceId: '2',
        //     title: 'sentry',
        //     start: '2024-07-20 06:00',
        //     end: '2024-07-20 09:00',
        //   }
        // ],

        // Group selected elements together so that they can be dragged together, saving these selected elements
        select: function (info) {
            function selectCheck(event) {
                return event.start >= selectAndDragStart && event.end <= selectAndDragEnd && event.getResources()[0].id == resourceId
            }

            // If already selected, cancel previous selection by removing all previous selections
            if (selectAndDragEvents !== null) {
                calendar.getEvents().forEach(event => {
                    event.setProp('groupId', '');
                });
                selectAndDragEvents = null
            }

            selectAndDragStart = info.start;
            selectAndDragEnd = info.end;

            const resourceId = info.resource.id
            selectAndDragEvents = calendar.getEvents().filter(selectCheck);
            for (let index = 0; index < selectAndDragEvents.length; index++) {
                const event = selectAndDragEvents[index];
                event.setProp("groupId", "1");
                // console.log(event.start, event.end, event.getResources()[0].title, event.title)  
                }
        },

        eventDrop: function(info) {
            // If events have been selected and dragged (multi select, drag and drop)
            if (selectAndDragEvents !== null) {
                function selectCheck(event) {
                    return event.start >= selectAndDragStart && event.end <= selectAndDragEnd && event.getResources()[0].id == newResourceId
                }

                function checkEventInDraggedEvents(event, draggedEvents) {
                    for (let j = 0; j < draggedEvents.length; j++) {
                        const draggedEvent = draggedEvents[j];
                        if (draggedEvent.title == event.title && draggedEvent.startStr == event.startStr && draggedEvent.endStr == event.endStr) {
                            return true
                        }
                    }
                    return false
                }

                const newResourceId = info.newResource.id;
                const oldResourceId = info.oldResource.id;
                const allEventsInTimeslot = calendar.getEvents().filter(selectCheck);
                const eventsToSwap = [];

                // Workaround since you cannot directly compare event objects
                for (let index = 0; index < allEventsInTimeslot.length; index++) {
                const event = allEventsInTimeslot[index];
                // console.log(draggedEvent.title, draggedEvent.start, draggedEvent.end)
                    if (!checkEventInDraggedEvents(event, selectAndDragEvents)) {
                        eventsToSwap.push(event)
                    } 
                }

                // console.log(selectAndDragEvents, allEventsInTimeslot, eventsToSwap);

                selectAndDragEvents.forEach(event => {
                    event.setProp("groupId", '')
                });
                selectAndDragEvents = null
                
                eventsToSwap.forEach(event => {
                    event.setResources([oldResourceId]);
                });
            }
            
            // Otherwise do singular event drag and drop
            else if (info.newResource !== null){
                const newEvent = info.event;
                const eventToSwap = calendar.getEvents()
                .filter(event => newEvent.startStr == event.startStr && newEvent.endStr == event.endStr && info.newResource.id == event.getResources()[0].id && info.oldEvent.title !== event.title)[0];
                
                // Swap the event if it exists
                if (eventToSwap !== undefined) {
                    eventToSwap.setResources([info.oldResource.id]);
                }
            }

            // Save the state of the calendar to the undoStack
            // Set undoTwice to true as if the person undo's once right after dropping the events,
            // the most recent saved state will be the current state of calendar
            undoStack.push(calendar.getEvents())
            undoTwice = true;
            console.log(undoStack, redoStack);
        },

        // To delete events if dragged to the trash icon
        eventDragStop: function(e) {
            // Drag to delete icon
            let trashEl = document.querySelector('.fcTrash') //as HTMLElement;

            let x1 = trashEl.offsetLeft;
            let x2 = trashEl.offsetLeft + trashEl.offsetWidth;
            let y1 = trashEl.offsetTop;
            let y2 = trashEl.offsetTop + trashEl.offsetHeight;

            if (e.jsEvent.pageX >= x1 && e.jsEvent.pageX <= x2 &&
                e.jsEvent.pageY >= y1 && e.jsEvent.pageY <= y2) {
                    e.event.dragRevertDuration = 0;
                    e.event.remove();
            }
        }
    });

    calendar.render();

    // Load the first state of the calendar into undostack
    undoStack.push(calendar.getEvents());
    console.log(undoStack, redoStack);

    // Undo on calendar
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 'z') {
            // let oldEvents = calendar.getEvents();
            if (undoTwice) {
                undo()
            }
            const previousState = undo();
            setNewCalendarEvents(previousState)
            console.log(undoStack, redoStack);
        }
    });

    // Redo on calendar
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 'y') {
            const previousState = redo();
            if (undoTwice) {
                redo()
            }
            setNewCalendarEvents(previousState)
        }
    });

    // Add trash icon to the right end of the header toolbar
    const locationForIcon = document.querySelector(".fc-header-toolbar > .fc-toolbar-chunk:nth-child(3)");
    const trash = document.createElement('div');
    trash.classList.add('fcTrash');
    trash.innerHTML = '<i class="fas fa-trash fa-2x" style="color: red"></i>';
    locationForIcon.appendChild(trash);

    // eel.expose(getCalendarEvents)
    function localISOString(localDate) {
        let tzoffset = localDate.getTimezoneOffset() * 60000; //offset in milliseconds
        let localISOTime = (new Date(localDate - tzoffset)).toISOString()
        return localISOTime
    }

    function getCalendarEventsForTimetable() {
        var eventsJson = []
        var events = calendar.getEvents();
        for (let index = 0; index < events.length; index++) {
            const event = events[index];
            var eventResources = event.getResources();
            var resourceIds = eventResources.map(function(resource) { return resource.id });

            eventsJson.push({
                'role': event.title,
                'start': localISOString(event.start),
                'end': localISOString(event.end),
                'trooper': resourceIds[0]
            })
        }
        console.log(eventsJson);
        return eventsJson
    }

    // Example of sending data over to python 
    // Approach is that you trigger the asyncronous function
    // Then it returns back the value to you from python once it is processed
    // This would be the timetable which is then re-displayed
    // document.querySelector('.bingle').onclick = async function () {
    //     let returnVal = await eel.convert_calendar_events_to_timetable(getCalendarEventsForTimetable())();
    //     console.log(returnVal);
    // }

    // FUNCTIONS FOR STEP 2
    function addAllAvailableShifts(availableShifts, trooperKeys) {
        for (const trooperName in availableShifts) {
            let trooperId = trooperKeys.indexOf(trooperName);
            let possibleShifts = availableShifts[trooperName];
            let selectElement = document.querySelector(`#shifts_${trooperId}`);
            for (let i = 0; i < selectElement.options.length; i++) {
                const shiftOption = selectElement.options[i];
                if (possibleShifts.includes(shiftOption.text)) {
                    shiftOption.disabled = false
                } else {
                    shiftOption.disabled = true
                }
            }
        }
    }

    function addAllocatedShifts(allocatedShifts, trooperKeys) {
        for (const shiftName in allocatedShifts) {
            let shiftTroopers = allocatedShifts[shiftName];

            for (let i = 0; i < shiftTroopers.length; i++) {
                const trooperName = shiftTroopers[i];
                const trooperId = trooperKeys.indexOf(trooperName);
                let selectElement = document.querySelector(`#shifts_${trooperId}`);
                selectElement.value = shiftName;
            }
        }
    }

    function addAllocatedHours(hoursList) {
        for (let i = 0; i < hoursList.length; i++) {
            const hours = hoursList[i];
            const hoursElement = document.querySelector(`#hours_${i}`);
            console.log(hoursElement);
            hoursElement.value = Number(hours);
        }
    }

    function validateTotalHours(totalHours) {
        const hoursElements = document.querySelectorAll('.hours-input');
        let userTotalHours = 0;
        for (let i = 0; i < hoursElements.length; i++) {
            const hours = hoursElements[i];
            userTotalHours += Number(hours.value);
        }

        if (userTotalHours !== totalHours) {
            displayFlashMessage('error', `Calculated total hours of ${userTotalHours} does not match actual total hours of ${totalHours}`);
            return false;
        } else {
            displayFlashMessage('success', 'Hours are matched')
            return true;
        }
    }

    function validateShiftDistribution() {
        let numMorning = Number(document.querySelector('#morning-shift-num').value);
        let numAfternoon = Number(document.querySelector('#afternoon-shift-num').value);
        let shiftSelectElements = document.querySelectorAll(".shift-select");
        
        let userNumMorning = 0;
        let userNumAfternoon = 0;
        for (let i = 0; i < shiftSelectElements.length; i++) {
            const shiftSelect = shiftSelectElements[i];
            let shiftName = shiftSelect.options[shiftSelect.selectedIndex].text;
            if (shiftName === "morning") {
                userNumMorning += 1
            } else if (shiftName === "afternoon"){
                userNumAfternoon += 1
            }
        }
        console.log(userNumMorning, numMorning);
        console.log(userNumAfternoon, numAfternoon)
        if (userNumAfternoon != numAfternoon) {
            displayFlashMessage("error", `Number of afternoon troopers of ${userNumAfternoon} doesnt match the expected number of ${numAfternoon}`);
            return false;
        } else if (userNumMorning != numMorning){
            displayFlashMessage("error", `Number of morning troopers of ${userNumMorning} doesnt match the expected number of ${numMorning}`);
            return false;
        } else {
            displayFlashMessage("success");
            return true;
        }
    }

    function exportShiftsAndHours() {
        let morningEndingTime = document.querySelector('#morning-ending-time').value;
        let afternoonStartingTime = document.querySelector('#afternoon-starting-time').value;

        let hoursList = Array.from(document.querySelectorAll('.hours-input')).map(x => Number(x.value));
        let shiftList = Array.from(document.querySelectorAll('.shift-select')).map(x => x[x.options.selectedIndex].value);

        console.log(hoursList, shiftList);
        return {
            'morningEndingTime': morningEndingTime,
            'afternoonStartingTime': afternoonStartingTime,
            'eventsJson': getCalendarEventsForTimetable(),
            'hours': hoursList,
            'shift': shiftList
        }


    }

    // FUNCTIONS FOR DISPLAYING FLASH MESSAGES
    function displayFlashMessage(type, errorMessage=null) {
        const successElement = document.querySelector('.success-msg');
        const errorElement = document.querySelector('.error-msg');
        if (type=="success") {
            successElement.classList.remove('hidden');
            errorElement.classList.add('hidden')
        } else {
            errorElement.classList.remove('hidden');
            successElement.classList.add('hidden')
            errorElement.innerText = 
            `An error occurred: ${errorMessage}`
        }
    }

    // SETTING UP OF FORM FOR SENDING DATA BACK AND FORTH
    function initMultiStepForm() {
        const progressNumber = document.querySelectorAll(".step").length;
        const slidePage = document.querySelector(".slide-page");
        const submitBtn = document.querySelector(".submit");
        const progressText = document.querySelectorAll(".step p");
        const progressCheck = document.querySelectorAll(".step .check");
        const bullet = document.querySelectorAll(".step .bullet");
        const pages = document.querySelectorAll(".page");
        const nextButtons = document.querySelectorAll(".next");
        const prevButtons = document.querySelectorAll(".prev");
        const stepsNumber = pages.length;
        const successElement = document.querySelector('.success-msg');
        const errorElement = document.querySelector('.error-msg');
        const hoursElements = document.querySelectorAll('.hours-input');
        const shiftElements = document.querySelectorAll('.shift-select');
    
        if (progressNumber !== stepsNumber) {
            console.warn(
                "Error, number of steps in progress bar do not match number of pages"
            );
        }
    
        document.documentElement.style.setProperty("--stepNumber", stepsNumber);
    
        let current = 1;
    
        for (let i = 0; i < nextButtons.length; i++) {
            nextButtons[i].addEventListener("click", async function (event) {
                
                function onDataSuccess(newEvents=null) {
                    // If there are new events to add
                    if (newEvents !== null) {
                        setNewCalendarEvents(newEvents);
                        // Add new events to stepHistoryStack
                        stepHistoryStack.push(newEvents)
                    } else {
                        stepHistoryStack.push(calendar.getEvents());
                    }
                    
                    slidePage.style.marginLeft = `-${
                        (100 / stepsNumber) * current
                    }%`;
                    bullet[current - 1].classList.add("active");
                    progressCheck[current - 1].classList.add("active");
                    progressText[current - 1].classList.add("active");
                    current += 1;
                    window.scrollTo(0,0);
                }

                
                event.preventDefault();
    
                // If generate sentry button is clicked:
                if (i === 0) {
                    try {
                        var newEvents = await eel.generate_sentry_for_calendar()();
                        onDataSuccess(newEvents)
                        displayFlashMessage('success')
                    } catch (error) {
                        displayFlashMessage('error', error.errorText)
                    }
                }

                // If confirm custom duties button clicked
                if (i === 1) {
                    try {
                        var result = await eel.assign_shifts_and_hours_for_calendar(getCalendarEventsForTimetable())();
                        addAllAvailableShifts(result.availableShifts, trooperKeys, calendar);
                        addAllocatedShifts(result.allocatedShifts, trooperKeys);
                        addAllocatedHours(result.hoursList);
                        onDataSuccess();
                        displayFlashMessage('success');
                        hoursElements.forEach(element => {
                            element.addEventListener('change', function () {
                                validateTotalHours(defaultParameters.total_hours);
                            })
                        });
                        shiftElements.forEach(element => {
                            element.addEventListener('change', validateShiftDistribution)
                        });
                    } catch (error) {
                        displayFlashMessage('error', error.errorText)
                    }
                }

                // If confirm shifts button clicked
                if (i === 2) {
                    if (validateShiftDistribution() && validateTotalHours(defaultParameters.total_hours)) {
                        let exportVal = exportShiftsAndHours();
                        try {
                            var newEvents = await eel.assign_duty_timeslots_to_troopers(exportVal)();
                            setNewCalendarEvents(newEvents)
                            onDataSuccess();
                            displayFlashMessage('success');
                        } catch (error) {
                            displayFlashMessage('error', error.errorText);
                        }

                    } else {
                        displayFlashMessage('error', 'Unable to confirm hours and shifts due to invalid input')
                    }
                }
                
                // TODO: Update the 
                if (i == 3) {
                    try {
                        var newEvents = await eel.assign_specific_duties_to_troopers(getCalendarEventsForTimetable())();
                        setNewCalendarEvents(newEvents);
                        onDataSuccess();
                        displayFlashMessage('success');
                    } catch (error) {
                        displayFlashMessage('error', error.errorText);
                    }
                }
            });
        }
    
        for (let i = 0; i < prevButtons.length; i++) {
            prevButtons[i].addEventListener("click", function (event) {
                event.preventDefault();

                // Get the step saved state of calendar in stepHistoryStack and set it
                stepHistoryStack.pop();
                var previousEvents = stepHistoryStack[stepHistoryStack.length -1];
                setNewCalendarEvents(previousEvents);
                
                // Reset the undo and redo stacks
                undoStack = [previousEvents];
                redoStack = []

                // Remove the flash messages present
                errorElement.classList.add('hidden');
                successElement.classList.add('hidden');

                slidePage.style.marginLeft = `-${
                    (100 / stepsNumber) * (current - 2)
                }%`;
                bullet[current - 2].classList.remove("active");
                progressCheck[current - 2].classList.remove("active");
                progressText[current - 2].classList.remove("active");
                current -= 1;
            });
        }
    
        // submitBtn.addEventListener("click", function () {
        //     bullet[current - 1].classList.add("active");
        //     progressCheck[current - 1].classList.add("active");
        //     progressText[current - 1].classList.add("active");
        //     current += 1;
        //     setTimeout(function () {
        //         alert("Your Form Successfully Signed up");
        //         location.reload();
        //     }, 800);
        // });
    }
    initMultiStepForm();

});