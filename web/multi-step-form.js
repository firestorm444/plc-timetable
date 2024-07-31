// Default parameters to send:
// roles, shift_blocks, num_morning, num_afternoon, num_random, timetable_date


document.addEventListener('DOMContentLoaded', async function() {
    var allShifts = ['morning', 'afternoon', 'random'];
    var selectAndDragEvents = null;
    var selectAndDragStart, selectAndDragEnd

    // Get default parameters from python and set the timetable date
    var defaultParameters = await eel.get_default_parameters()();
    var timetableDate = new Date(defaultParameters.timetable_date);

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

    // Set up calendar 
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
        resources: await eel.convert_troopers_to_calendar_resources()(),
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
                z.value = hours
                z.type = 'number'
                z.style.width = '40px'
                z.style.alignSelf = 'center'

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
                var shiftSelect = document.createElement('select')

                for (let index = 0; index < allShifts.length; index++) {
                    var shift = allShifts[index];
                    var shiftOption = document.createElement('option');
                    shiftOption.text = shift;
                    if (possibleShifts.includes(shift)) {
                    shiftOption.disabled = false
                    } else {
                    shiftOption.disabled = true
                    }
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
            var resources = event.getResources();
            var resourceIds = resources.map(function(resource) { return resource.id });

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
    document.querySelector('.bingle').onclick = async function () {
        let returnVal = await eel.convert_calendar_events_to_timetable(getCalendarEventsForTimetable())();
        console.log(returnVal);
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
    
        if (progressNumber !== stepsNumber) {
            console.warn(
                "Error, number of steps in progress bar do not match number of pages"
            );
        }
    
        document.documentElement.style.setProperty("--stepNumber", stepsNumber);
    
        let current = 1;
    
        for (let i = 0; i < nextButtons.length; i++) {
            nextButtons[i].addEventListener("click", async function (event) {
                event.preventDefault();
    
                // If generate sentry button is clicked:
                if (i === 0) {
                    // TODO: convert eventsJson to timetable
                    var newEvents = await eel.generate_sentry_for_calendar()();
                    setNewCalendarEvents(newEvents);
                }


                // Add new events to stepHistoryStack
                stepHistoryStack.push(newEvents)
                console.log(stepHistoryStack);

                slidePage.style.marginLeft = `-${
                    (100 / stepsNumber) * current
                }%`;
                bullet[current - 1].classList.add("active");
                progressCheck[current - 1].classList.add("active");
                progressText[current - 1].classList.add("active");
                current += 1;
                window.scrollTo(0,0);
                
            });
        }
    
        for (let i = 0; i < prevButtons.length; i++) {
            prevButtons[i].addEventListener("click", function (event) {
                event.preventDefault();

                // Get the step saved state of calendar in stepHistoryStack and set it
                stepHistoryStack.pop();
                var previousEvents = stepHistoryStack[stepHistoryStack.length -1];
                setNewCalendarEvents(previousEvents);

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