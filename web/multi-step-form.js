// Default parameters to send:
// roles, shift_blocks, num_morning, num_afternoon, num_random, timetable_date


document.addEventListener('DOMContentLoaded', async function() {
    var allShifts = ['morning', 'afternoon', 'random'];
    var selectAndDragEvents = null;
    var selectAndDragStart, selectAndDragEnd
    var refreshHours = false;

    // Get default parameters from python and set the timetable date
    await eel.generate_global_timetable_variables();
    var defaultParameters = await eel.get_default_parameters()();
    var trooperKeys = defaultParameters.trooper_keys;
    var timetableDate = new Date(defaultParameters.timetable_date);
    var resources = await eel.convert_troopers_to_calendar_resources()();
    console.log(resources);

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

    // Set up step history stack which is the record of the states of the different steps
    var stepHistoryStack = [[]];

    function undo() {
        if (undoStack.length > 1) {
            undoStack.pop()
        }
        // Peek at the last element
        let element = undoStack[undoStack.length-1];

        if (undoStack.length > 1) {
            redoStack.push(element);
        }
        return element
    }

    function redo() {
        if (redoStack.length == 0) {
            return false
        }

        if (redoStack.length >= 1) {
            redoStack.pop()
        }
        let element = redoStack[redoStack.length-1];
        if (redoStack.length >= 1) {
            undoStack.push(element);
        }
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

    // TODO: Modify to add for both custom and normal roles
    // Set up draggable elements
    let counter = 0;
    let fullCalendarDraggables = []
    let normalDraggableContainer = document.querySelector('.normal-roles-draggable-container')
    let customDraggableContainer = document.querySelector('.custom-roles-draggable-container')

    for (let i = 0; i < defaultParameters.roles.length; i++) {
        const role = defaultParameters.roles[i];
        if (role.name == 'None' || role.name == 'TODO') {
            var eventTitle = role.calendar_name
        } else {
            var eventTitle = role.name
        }

        // Create a new draggable element
        let draggableElement = document.createElement('div');
        draggableElement.classList.add('draggable');
        draggableElement.style.backgroundColor = role.color;
        draggableElement.innerText = eventTitle;

        if (role.is_custom) {
            let customIcon = customDraggableContainer.querySelector('.custom-label');
            customIcon.insertAdjacentElement('afterend', draggableElement)
        } else {
            normalDraggableContainer.appendChild(draggableElement)
        }

    
        // Link draggable element to fullcalendar
        fullCalendarDraggables[counter] = new FullCalendar.Draggable(draggableElement, {
            eventData: {
                title: eventTitle,
                duration: '01:00',
                color: role.color,
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
        contentHeight: 'auto',
        expandRows: true,
        initialDate: timetableDate,
        headerToolbar: {
            start: 'title',
            center: '',
            end: ''
        },
        resources: resources,
        resourceOrder: "order",
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

                    if (event.groupId == '') {
                        eventsToSwap.push(event)
                    }


                    // // console.log(draggedEvent.title, draggedEvent.start, draggedEvent.end)
                    //     if (!checkEventInDraggedEvents(event, selectAndDragEvents)) {
                    //         eventsToSwap.push(event)
                    //     } 
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

            // Update the hours if necessary
            if (refreshHours) {
                console.log('test');
                updateTrooperHours(trooperKeys)
            }
            // console.log(undoStack, redoStack);
        },

        eventReceive: function () {
            // Update the hours if necessary
            if (refreshHours) {
                updateTrooperHours(trooperKeys)
            }
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
    // console.log(undoStack, redoStack);

    // Undo on calendar
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 'z') {
            const previousState = undo();
            if (previousState !== false) {
                setNewCalendarEvents(previousState)
            }
            console.log(undoStack, redoStack);
        }
    });

    // TODO: Redo on calendar
    // document.addEventListener('keydown', function(event) {
    //     if (event.ctrlKey && event.key === 'y') {
    //         const previousState = redo();
    //         if (previousState !== false) {
    //             setNewCalendarEvents(previousState)
    //         }
    //         console.log(undoStack, redoStack)
    //     }
    // });

    // Add trash icon to the right end of the header toolbar
    const locationForIcon = document.querySelector(".fc-header-toolbar > .fc-toolbar-chunk:nth-child(3)");
    const parentDiv = document.createElement('div');
    parentDiv.classList.add('parent-toolbar')

    const trash = document.createElement('div');
    trash.classList.add('fcTrash');
    trash.innerHTML = '<i class="fas fa-trash fa-2x" style="color: red"></i>';

    const swapShiftsButton = document.createElement('button');
    swapShiftsButton.innerText = 'Swap Shifts';
    swapShiftsButton.classList.add('swap-button', 'hidden');

    locationForIcon.appendChild(parentDiv);
    parentDiv.appendChild(swapShiftsButton);
    parentDiv.appendChild(trash);


    // eel.expose(getCalendarEvents)
    function localISOString(localDate) {
        let tzoffset = localDate.getTimezoneOffset() * 60000; //offset in milliseconds
        let localISOTime = (new Date(localDate - tzoffset)).toISOString()
        return localISOTime
    }

    function getCalendarEventsForTimetable(events=calendar.getEvents()) {
        var eventsJson = []
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
        // console.log(eventsJson);
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
    function swapShifts(trooperKeys) {
        let allShiftsOuter = []
        const allShifts = document.querySelectorAll('.shift-select');
        allShifts.forEach( shift => {
            allShiftsOuter.push(shift.closest(".fc-datagrid-cell"))
        });
        
        allShiftsOuter.forEach( outerShift => {
            outerShift.addEventListener('click', function(e) {
                // If the padding is clicked
                var selectedElement = e.target;
                var numSelected = document.querySelectorAll('.swap-shift-selected').length
                if (!selectedElement.classList.contains('shift-select')){
                    // Check if the element has already been selected
                    // If this element is clicked again, it is unselected
                    // Otherwise it is selected
                    // '.closest' method is used since there are many sub elements in the td cell in fullcalendar that can be clicked
                    var swapSelected = selectedElement.closest('.swap-shift-selected');
                    var shiftSelectElement = selectedElement.querySelector('.shift-select');

                    // If the element clicked is already selected, remove it 
                    if (swapSelected !== null) {
                        outerShift.classList.remove('swap-shift-selected');
                        shiftSelectElement.disabled = false;

                    } else if (numSelected < 2) {
                        outerShift.classList.add('swap-shift-selected');
                        shiftSelectElement.disabled = true;
        
                    }
                }

                numSelected = document.querySelectorAll('.swap-shift-selected').length;
                console.log(numSelected);
                if (numSelected == 2) {
                    swapShiftsButton.classList.remove('hidden');
                } else {
                    swapShiftsButton.classList.add('hidden');
                }
                
            })
        })

        swapShiftsButton.addEventListener('click', function() {
            var outerSelected = document.querySelectorAll('.swap-shift-selected');
            
            var swapElement0 = outerSelected[0].querySelector('.shift-select');
            var trooperId0 = Number(swapElement0.id.replace('shifts_', ''));
            var availableShifts0 = Array.from(swapElement0.options).filter(option => option.disabled == false).map(option => option.value)
            var selectedShift0 = swapElement0.options[swapElement0.selectedIndex].value;
            var hoursElement0 = document.querySelector(`#hours_${trooperId0}`)

            var swapElement1 = outerSelected[1].querySelector('.shift-select');
            var trooperId1 = Number(swapElement1.id.replace('shifts_', ''));
            var availableShifts1 = Array.from(swapElement1.options).filter(option => option.disabled == false).map(option => option.value)
            var selectedShift1 = swapElement1.options[swapElement1.selectedIndex].value;
            var hoursElement1 = document.querySelector(`#hours_${trooperId1}`);

            
            // Swap the 2 elements only if the selected shift of 1 element is available in the other element and vice versa
            if (availableShifts1.includes(selectedShift0) && availableShifts0.includes(selectedShift1)) {
                // Swap the selected values
                let tempSelected = selectedShift0;
                swapElement0.value = selectedShift1;
                swapElement1.value = tempSelected;

                console.log(hoursElement0, hoursElement1);
                // Swap the hours
                let tempHours = hoursElement0.value;
                hoursElement0.value = hoursElement1.value;
                hoursElement1.value = tempHours;

                displayTimetableFlashMessage("success")
                
            } else {
                displayTimetableFlashMessage("error", "Unable to swap shifts")
            }
            

            // Remove the applied formatting
            swapElement0.disabled = false;
            swapElement1.disabled = false;

            // Remove the selected classes
            document.querySelectorAll('.swap-shift-selected').forEach(element => {
                element.classList.remove("swap-shift-selected");
            });
        })
    }

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
            displayTimetableFlashMessage('error', `Calculated total hours of ${userTotalHours} does not match actual total hours of ${totalHours}`);
            return false;
        } else {
            displayTimetableFlashMessage('success', 'Hours are matched')
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
        // console.log(userNumMorning, numMorning);
        // console.log(userNumAfternoon, numAfternoon)
        if (userNumAfternoon != numAfternoon) {
            displayTimetableFlashMessage("error", `Number of afternoon troopers of ${userNumAfternoon} doesnt match the expected number of ${numAfternoon}`);
            return false;
        } else if (userNumMorning != numMorning){
            displayTimetableFlashMessage("error", `Number of morning troopers of ${userNumMorning} doesnt match the expected number of ${numMorning}`);
            return false;
        } else {
            displayTimetableFlashMessage("success");
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

    function updateTrooperHours(trooperKeys) {
        var trooperHours = Array(trooperKeys.length).fill(0);
        var allEvents = calendar.getEvents();
        for (let i = 0; i < allEvents.length; i++) {
            const event = allEvents[i];
            var eventDuration = Math.floor((event.end.getTime() - event.start.getTime())/3600000);
            var trooperIndex = Number(event.getResources()[0].id);
            trooperHours[trooperIndex] += eventDuration;
        }

        for (let i = 0; i < trooperKeys.length; i++) {
            const trooperName = trooperKeys[i];
            const trooperHoursInput = document.querySelector(`#hours_${i}`);
            if (trooperHoursInput.value != trooperHours[i]) {
                trooperHoursInput.value = trooperHours[i];
            }
        }
    }

    // FUNCTIONS FOR STEP 4
    function updateMiscellaneousRoles(trooperKeys, breakfast, dinner, lastEnsurer) {
        const breakfastSelect = document.querySelector('#breakfast');
        const dinnerSelect = document.querySelector('#dinner');
        const lastEnsurerSelect = document.querySelector('#last-ensurer');

        console.log(breakfastSelect, dinnerSelect, lastEnsurerSelect);
        for (let i = 0; i < trooperKeys.length; i++) {
            const trooperName = trooperKeys[i];
            
            breakfastSelect.appendChild(new Option(trooperName));
            dinnerSelect.appendChild(new Option(trooperName));
            lastEnsurerSelect.appendChild(new Option(trooperName));
        }

        breakfastSelect.value = breakfast;
        dinnerSelect.value = dinner;
        lastEnsurerSelect.value = lastEnsurer;
    }

    // FUNCTIONS FOR SUBMIT STEP
    function handleFormSubmit() {
        const breakfastSelect = document.querySelector('#breakfast');
        const dinnerSelect = document.querySelector('#dinner');
        const lastEnsurerSelect = document.querySelector('#last-ensurer');

        return {
            'breakfast': breakfastSelect.value,
            'dinner': dinnerSelect.value,
            'lastEnsurer': lastEnsurerSelect.value,
            'duty': getCalendarEventsForTimetable(stepHistoryStack[stepHistoryStack.length-2]),
            'OCDuty': getCalendarEventsForTimetable(stepHistoryStack[stepHistoryStack.length-1])
        }
    }
 
    // FUNCTIONS FOR DISPLAYING FLASH MESSAGES
    function displayTimetableFlashMessage(type, errorMessage=null) {
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
                console.log(i);
                function onDataSuccess(newEvents=null) {
                    // If there are new events to add
                    if (newEvents !== null) {
                        setNewCalendarEvents(newEvents);
                    } else {
                        newEvents = calendar.getEvents();
                    }
                    stepHistoryStack.push(newEvents);

                    undoStack = [newEvents];
                    redoStack = [];
                    
                    console.log(undoStack, redoStack, stepHistoryStack)
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
                        displayTimetableFlashMessage('success')
                    } catch (error) {
                        displayTimetableFlashMessage('error', error.errorText)
                    }
                }

                // If confirm custom duties button clicked
                if (i === 1) {
                    try {
                        var result = await eel.assign_shifts_and_hours_for_calendar(getCalendarEventsForTimetable())();
                        console.log(result);
                        addAllAvailableShifts(result.availableShifts, trooperKeys, calendar);
                        addAllocatedShifts(result.allocatedShifts, trooperKeys);
                        addAllocatedHours(result.hoursList);
                        onDataSuccess();
                        displayTimetableFlashMessage('success');
                        hoursElements.forEach(element => {
                            element.addEventListener('change', function () {
                                validateTotalHours(defaultParameters.total_hours);
                            })
                        });
                        shiftElements.forEach(element => {
                            element.addEventListener('change', validateShiftDistribution)
                        });

                        // Add dynamic shift generated
                        if (result.dynamicShiftFound) {
                            console.log(result.dynamicShiftBlocksISO)
                            morningEndingTime.value = result.dynamicShiftBlocksISO.morning[1];
                            afternoonStartingTime.value = result.dynamicShiftBlocksISO.afternoon[0];
                        } else {
                            displayTimetableFlashMessage('error', 'Unable to find a valid set of start/end times. Please change 1 or more shifts to random')
                        }

                        swapShifts(trooperKeys);
                    } catch (error) {
                        displayTimetableFlashMessage('error', error.errorText)
                    }
                }

                // If confirm shifts button clicked
                if (i === 2) {
                    if (true) {
                    // TODO: Fix validation
                    // if (validateShiftDistribution() && validateTotalHours(defaultParameters.total_hours)) {
                        let exportVal = exportShiftsAndHours();
                        try {
                            var newEvents = await eel.assign_duty_timeslots_to_troopers(exportVal)();
                            setNewCalendarEvents(newEvents)
                            onDataSuccess();
                            displayTimetableFlashMessage('success');
                            // calendar.setOption('resourceAreaColumns', [
                            //     {
                            //         field: 'title',
                            //         headerContent: 'Trooper'
                            //     },
                        
                            //     {
                            //         headerContent: 'Hours',
                            //         cellContent: function(arg) {
                            //             var extendedProps = arg.resource.extendedProps;
                            //             var hours = extendedProps.hours
                                        
                            //             var z = document.createElement('input');
                            //             z.classList.add('hours-input')
                            //             z.value = hours;
                            //             z.type = 'number';
                            //             z.style.width = '40px';
                            //             z.style.alignSelf = 'center';
                            //             z.id = `hours_${arg.resource.id}`
                        
                            //             let arrayOfDomNodes = [z];
                            //             return { domNodes: arrayOfDomNodes}
                            //         }
                            //     }])
                            refreshHours = true;
                        } catch (error) {
                            displayTimetableFlashMessage('error', error.errorText);
                        }

                    } else {
                        displayTimetableFlashMessage('error', 'Unable to confirm hours and shifts due to invalid input')
                    }
                }
                
                if (i == 3) {
                    try {
                        var result = await eel.assign_specific_duties_to_troopers(getCalendarEventsForTimetable())();
                        setNewCalendarEvents(result.newEvents);
                        onDataSuccess();
                        displayTimetableFlashMessage('success');
                        refreshHours = true;
                        updateMiscellaneousRoles(trooperKeys, result.breakfast, result.dinner, result.lastEnsurer);
                    } catch (error) {
                        displayTimetableFlashMessage('error', error.errorText);
                    }
                }

                if (i == 4) {
                    setNewCalendarEvents(calendar.getEvents());
                    onDataSuccess();
                    displayTimetableFlashMessage('success');
                }

                if (i == 5) {
                    onDataSuccess();
                    displayTimetableFlashMessage('success');
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
    
        submitBtn.addEventListener("click", async function () {
            bullet[current - 1].classList.add("active");
            progressCheck[current - 1].classList.add("active");
            progressText[current - 1].classList.add("active");
            current += 1;
            var submitData = handleFormSubmit();
            try {
                var result = await eel.export_timetable(submitData)();
                alert(result);
            } catch (error) {
                displayTimetableFlashMessage('error', error.errorText);
            }
            // setTimeout(function () {
            //     alert("Your Form Successfully Signed up");
            //     location.reload();
            // }, 800);
        });
    }
    initMultiStepForm();

});