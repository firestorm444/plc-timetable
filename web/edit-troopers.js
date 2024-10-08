// SET CURRENT TROOPERS HELPER FUNCTIONS
function editFormsOnSubmit(editTrooperForms) {
    editTrooperForms.forEach(trooperForm => {
        trooperForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formElements = trooperForm.elements;
            const trooperId = formElements.namedItem("edit-trooper-id").value
            const trooperName = formElements.namedItem("edit-trooper-name").value
            const trooperType = formElements.namedItem("edit-trooper-type").value;
            const trooperStatus = formElements.namedItem("edit-trooper-status").value;
            const isPermanent = formElements.namedItem("edit-trooper-is-permanent").value === "true";
            const excuseRMJ = formElements.namedItem("edit-trooper-excuse-rmj").value === "true";

            const trooperInfo = {
                "id": trooperId,
                "name": trooperName.toLowerCase(),
                "trooper_type": trooperType,
                "status": trooperStatus,
                "is_permanent": isPermanent,
                "excuse_rmj": excuseRMJ
            }

            try {
                var result = await eel.edit_trooper(trooperInfo)();
                trooperForm.previousElementSibling.style.display = 'none';
                trooperForm.style.display = 'none';
                displayFlashMessage(result, "success");
                await loadPage();
            } catch (error) {
                displayFlashMessage(error.errorText, "error");
            }
        })
    });
}

function manageTrooperAttendance() {
    const editTrooperListElements = document.querySelectorAll('#edit-trooper-list .trooper-info');
    editTrooperListElements.forEach(listElement => {
        const absentIcon = listElement.querySelector('.absent-icon');
        const presentIcon = listElement.querySelector('.present-icon');
        const absenceInput = listElement.querySelector('.absence-reason');

        console.log(absentIcon, presentIcon)

        presentIcon.addEventListener('click', function () {
            presentIcon.classList.add('hidden');
            absentIcon.classList.remove('hidden');
            absenceInput.classList.remove('hidden');
        })

        absentIcon.addEventListener('click', function () {
            absentIcon.classList.add('hidden');
            absenceInput.classList.add('hidden');
            presentIcon.classList.remove('hidden');

        })
    });
}

function onTrooperArchive() {
    const editTrooperListElements = document.querySelectorAll('#edit-trooper-list .trooper-info');
    editTrooperListElements.forEach(listElement => {
        const trooperId = Number(listElement.dataset.id);
        const archiveButton = listElement.querySelector('.archive-btn');
        
        archiveButton.addEventListener('click', async function() {
            try {
                var result = await eel.archive_trooper(trooperId)();
                displayFlashMessage(result, "success");
                await loadPage();
            } catch (error) {
                displayFlashMessage(error.errorText, "error");
            }
        })

    });
}

// SET CURRENT TROOPERS MAIN FUNCTION
function setCurrentTroopers(currentTroopers) {
    const editTrooperList = document.querySelector('#edit-trooper-list');
    
    // Clear the trooper list except for beginning row
    const elementsToDelete = editTrooperList.querySelectorAll('.trooper-info')
    elementsToDelete.forEach(element => {
        element.remove();
    });

    // Create the li element and append the info to it
    for (let i = 0; i < currentTroopers.length; i++) {
        const trooper = currentTroopers[i];
        var liInnerHtml = `
            <i class="fas fa-bars fa-2x drag-icon"></i>
            <div class="info-text">
                <strong>${capitalise(trooper.name)}</strong><br>
                <div class="trooper-type">${capitalise(trooper.trooper_type)}</div>
            </div> 
            <div class="icons">
                <input type="text" placeholder="Enter absence reason" class="absence-reason ${(trooper.present) ? 'hidden' : ''}" value=${!(trooper.present) ? trooper.reason_for_absence : ''}>
                <div class="edit-icon absent-icon ${(trooper.present) ? 'hidden' : ''}"><i class="fas fa-calendar-times fa-2x absent"></i></div>
                <div class="edit-icon present-icon ${!(trooper.present) ? 'hidden' : ''}"><i class="fas fa-calendar-check fa-2x present"></i></div>
                <button class="swap-button edit-trooper-btn">Edit Trooper</button>
                <button class="swap-button archive-btn" style="background-color: red;">Archive</button>
                <div class="overlay hidden"></div>
                <form action="" class="trooper-form edit-trooper-form page">
                    <span class="modalClose">&times;</span>
                    <h2>Edit Trooper</h2>
                    <input type="hidden" name="edit-trooper-id" value=${trooper.id}>
                    <div class="field">
                        <div class="label">Name</div>
                        <input type="text" name="edit-trooper-name" value="${trooper.name}" required>
                    </div>
                    <div class="field">
                        <div class="label">Type</div>
                        <div class="toggle-switch">
                            <input type="radio" name="edit-trooper-type" id="edit-trooper-type-combat-${i}" class="option-1-input" value="combat" ${(trooper.trooper_type == 'combat') ? 'checked' : ''}>
                            <input type="radio" name="edit-trooper-type" id="edit-trooper-type-service-${i}" class="option-2-input" value="service" ${(trooper.trooper_type == 'service') ? 'checked' : ''}>
                                <label for="edit-trooper-type-combat-${i}" class="option option-1-label">
                                <div class="dot"></div>
                                    <span>Combat</span>
                                    </label>
                                <label for="edit-trooper-type-service-${i}" class="option option-2-label">
                                <div class="dot"></div>
                                    <span>Service</span>
                                </label>
                        </div>
                    </div>
                    <div class="field">
                        <div class="label">Status</div>
                        <div class="toggle-switch">
                            <input type="radio" name="edit-trooper-status" id="edit-trooper-status-stayin-${i}" class="option-1-input" value="stay-in" ${(trooper.status == 'stay-in') ? 'checked' : ''}>
                            <input type="radio" name="edit-trooper-status" id="edit-trooper-status-stayout-${i}" class="option-2-input" value="stay-out" ${(trooper.status == 'stay-out') ? 'checked' : ''}>
                                <label for="edit-trooper-status-stayin-${i}" class="option option-1-label">
                                <div class="dot"></div>
                                    <span>Stay-in</span>
                                    </label>
                                <label for="edit-trooper-status-stayout-${i}" class="option option-2-label">
                                <div class="dot"></div>
                                    <span>Stay-out</span>
                                </label>
                        </div>
                    </div>

                    <div class="field">
                        <div class="label">Type</div>
                        <div class="toggle-switch">
                            <input type="radio" name="edit-trooper-is-permanent" id="edit-trooper-permanent-${i}" class="option-1-input" value="true" ${(trooper.is_permanent) ? 'checked' : ''}>
                            <input type="radio" name="edit-trooper-is-permanent" id="edit-trooper-rf-${i}" class="option-2-input" value="false" ${(!trooper.is_permanent) ? 'checked' : ''}>
                                <label for="edit-trooper-permanent-${i}" class="option option-1-label">
                                <div class="dot"></div>
                                    <span>Permanent</span>
                                    </label>
                                <label for="edit-trooper-rf-${i}" class="option option-2-label">
                                <div class="dot"></div>
                                    <span>RF</span>
                                </label>
                        </div>
                    </div>

                    <div class="field">
                        <div class="label">Excuse RMJ</div>
                        <div class="toggle-switch">
                            <input type="radio" name="edit-trooper-excuse-rmj" id="edit-trooper-excuse-rmj-yes-${i}" class="option-1-input" value="true" ${(trooper.excuse_rmj) ? 'checked' : ''}>
                            <input type="radio" name="edit-trooper-excuse-rmj" id="edit-trooper-excuse-rmj-no-${i}" class="option-2-input" value="false" ${(!trooper.excuse_rmj) ? 'checked' : ''}>
                                <label for="edit-trooper-excuse-rmj-yes-${i}" class="option option-1-label">
                                <div class="dot"></div>
                                    <span>Yes</span>
                                    </label>
                                <label for="edit-trooper-excuse-rmj-no-${i}" class="option option-2-label">
                                <div class="dot"></div>
                                    <span>No</span>
                                </label>
                        </div>
                    </div>

                    <div class="btn-field trooper-submit-btn">
                        <button class="firstNext next" type="submit">Submit</button>
                    </div>

                </form>
            </div>`

        // Add the elements to the list
        const trooperInfoElement = document.createElement('li');
        trooperInfoElement.classList.add('trooper-info');
        trooperInfoElement.dataset.id = trooper.id;
        trooperInfoElement.innerHTML = liInnerHtml;
        editTrooperList.appendChild(trooperInfoElement);
    }
    
    // change display text - "displaying n troopers" --> change the n
    const displayText = document.querySelector("#edit-trooper-list .first-row em");
    displayText.textContent = `Displaying ${currentTroopers.length} troopers`
    
    // Reload modals
    reloadLightboxes('.edit-trooper-btn', '.edit-trooper-form');
    // addLightboxes();
    
    const editTrooperForms = document.querySelectorAll('.edit-trooper-form');
    // Add event listeners to manage the submitting of edit forms
    editFormsOnSubmit(editTrooperForms);

    // Add event listeners to manage the change of attendance
    manageTrooperAttendance();

    // Add event listeners to manage the archiving of troopers
    onTrooperArchive();


    var sortable = new Sortable(editTrooperList, {
        handle: ".drag-icon",
        animation: 150,
        // onMove: function (evt) {
        //     console.log('terue');
        // }
    });
}


// SET ARCHIVED TROOPERS HELPER FUNCTIONS
function onTrooperUnarchive() {
    const archivedTrooperListElements = document.querySelectorAll('#archived-trooper-list .trooper-info');
    archivedTrooperListElements.forEach(listElement => {
        const trooperId = Number(listElement.dataset.id);
        const unarchiveButton = listElement.querySelector('.unarchive-btn');

        unarchiveButton.addEventListener('click', async function() {
            try {
                var result = await eel.unarchive_trooper(trooperId)();
                displayFlashMessage(result, "success");
                await loadPage();
            } catch (error) {
                displayFlashMessage(error.errorText, "error");
            }
        })

    });
}

function onTrooperDelete() {
    const archivedTrooperListElements = document.querySelectorAll('#archived-trooper-list .trooper-info');
    archivedTrooperListElements.forEach(listElement => {
        const trooperId = Number(listElement.dataset.id);
        const deleteButton = listElement.querySelector('.delete-btn');

        deleteButton.addEventListener('click', async function() {
            let confirmation = confirm('Are you sure you want to delete the trooper? Only delete if he has ORD');
            if (confirmation) {
                try {
                    var result = await eel.delete_trooper(trooperId)();
                    displayFlashMessage(result, "success");
                    await loadPage();
                } catch (error) {
                    displayFlashMessage(error.errorText, "error");
                }
            }      
        });
    });

}

// SET ARCHIVED TROOPERS MAIN FUNCTION
function setArchivedTroopers(archivedTroopers) {
    const archivedTrooperList = document.querySelector('#archived-trooper-list')
    // Clear the trooper list except for beginning row
    while (archivedTrooperList.childElementCount > 1) {
        archivedTrooperList.removeChild(archivedTrooperList.lastElementChild);
    }

    for (let i = 0; i < archivedTroopers.length; i++) {
        const archivedTrooper = archivedTroopers[i];
        var liInnerHtml = `
            <div class="info-text">
                <strong>${capitalise(archivedTrooper.name)}</strong><br>
                <div class="trooper-type">${capitalise(archivedTrooper.trooper_type)}</div>
            </div> 
            <div class="icons">
                <button class="swap-button unarchive-btn">Unarchive</button>
                <button class="swap-button delete-btn" style="background-color: red;">Delete</button>
            </div>
        `

        // Add the elements to the list
        const trooperInfoElement = document.createElement('li');
        trooperInfoElement.classList.add('trooper-info');
        trooperInfoElement.dataset.id = archivedTrooper.id;
        trooperInfoElement.innerHTML = liInnerHtml;
        archivedTrooperList.appendChild(trooperInfoElement);
    }

    // Change display text - "displaying n troopers" --> change the n
    const displayText = document.querySelector("#archived-trooper-list .first-row em");
    displayText.textContent = `Displaying ${archivedTroopers.length} troopers`

    // Add event listeners to manage the unarchiving of troopers
    onTrooperUnarchive();

    // Add event listeners to manage the deleting of troopers
    onTrooperDelete();

    // var searchInput = document.querySelector('.search')
    // searchInput.addEventListener('keyup', function filterClients() {
    //     // Declare variables
    //     var filter, ul, li, clientName, i, txtValue;
    //     filter = searchInput.value.toUpperCase();
    //     li = document.querySelectorAll('#tosearch');

    //     // Loop through all list items, and hide those who don't match the search query
    //     for (i = 0; i < li.length; i++) {
    //         clientName = li[i].querySelector('.info-text strong').innerText;
    //         if (clientName.toUpperCase().indexOf(filter) > -1) {
    //             li[i].style.display = "";
    //         } else {
    //             li[i].style.display = "none";
    //         }
    //     }
    //     }
    // )
}



// MAIN FUNCTION ON PAGE RELOAD
async function loadPage() {
    try {
        const result = await eel.get_troopers()();
        const currentTroopers = result[0];
        const archivedTroopers = result[1];
        setCurrentTroopers(currentTroopers);
        setArchivedTroopers(archivedTroopers);
        addLightboxes();
        window.scrollTo(0,0);

    } catch (error) {
        displayFlashMessage(error.errorText, "error");
    }
}


function addFormOnSubmit() {
    // Manage the submit of add trooper form
    const addTrooperForm = document.querySelector('#add-trooper-form');
    addTrooperForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        const formElements = addTrooperForm.elements;
        const trooperName = formElements.namedItem("add-trooper-name").value
        const trooperType = formElements.namedItem("add-trooper-type").value;
        const trooperStatus = formElements.namedItem("add-trooper-status").value;
        const isPermanent = formElements.namedItem("add-trooper-is-permanent").value === "true";
        const excuseRMJ = formElements.namedItem("add-trooper-excuse-rmj").value === "true";

        const trooperInfo = {
            "name": trooperName.toLowerCase(),
            "trooper_type": trooperType,
            "status": trooperStatus,
            "is_permanent": isPermanent,
            "excuse_rmj": excuseRMJ
        }

        try {
            var result = await eel.add_trooper(trooperInfo)();
            addTrooperForm.reset();
            addTrooperForm.previousElementSibling.style.display = 'none';
            addTrooperForm.style.display = 'none';
            displayFlashMessage(result, "success");
            await loadPage();
        } catch (error) {
            displayFlashMessage(error.errorText, "error");
        }

    })
}


async function saveTrooperChanges() {
    const currentTroopers = document.querySelectorAll('#edit-trooper-list .trooper-info');
    var trooperOrder = [];
    var trooperAttendance = new Map;

    for (let i = 0; i < currentTroopers.length; i++) {
        let trooper = currentTroopers[i];
        let trooperId = Number(trooper.dataset.id);

        let trooperAbsent = trooper.querySelector('.present-icon').classList.contains('hidden');
        let trooperPresent = trooper.querySelector('.absent-icon').classList.contains('hidden');

        let indivTrooperAttendance = {}
        indivTrooperAttendance.present = trooperPresent;

        if (trooperAbsent) {
            indivTrooperAttendance.reason_for_absence = trooper.querySelector('.absence-reason').value;
        }

        trooperOrder.push(trooperId);
        trooperAttendance.set(trooperId, indivTrooperAttendance)
    }


    trooperAttendance = Object.fromEntries(trooperAttendance);
    try {
        await eel.save_trooper_order(trooperOrder);
        await eel.save_trooper_attendance(trooperAttendance);
        displayFlashMessage('Successfully saved changes', "success");
        await loadPage();

    } catch (error) {
        displayFlashMessage(error.errorText);
    }
}



document.addEventListener("DOMContentLoaded", function() {
    const saveChangesButton = document.querySelector('.save-btn');
    saveChangesButton.addEventListener('click', saveTrooperChanges);
    document.addEventListener("keydown",  async function(e) {
        if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)  && e.key == "s") {
          e.preventDefault();
          await saveTrooperChanges();
        }
      }, false);
    addFormOnSubmit();
    loadPage();

})