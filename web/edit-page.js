function capitalise(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function reloadLightboxes(iconName, containerName) {
    $(iconName).click(function(event) {
        event.preventDefault();
        $(this).siblings(containerName).fadeIn(350);
        $(this).siblings(containerName).prev('.overlay').fadeIn(350);
      });
}


function editFormsOnSubmit() {
    const editTrooperForms = document.querySelectorAll('.edit-form');
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
                alert(result);
                await getTroopers();
            } catch (error) {
                console.log(error)
            }

        })
    });
}





async function getTroopers() {
    const troopers = await eel.get_permanent_troopers()();
    
    const editTrooperList = document.querySelector('#edit-trooper-list');
    
    // Clear the trooper list except for beginning row
    while (editTrooperList.childElementCount > 1) {
        editTrooperList.removeChild(editTrooperList.lastElementChild);
    }

    // Create the li element and append the info to it
    for (let i = 0; i < troopers.length; i++) {
        const trooper = troopers[i];
        var liInnerHtml = `
            <div class="info-text">
                <strong>${capitalise(trooper.name)}</strong><br>
                <div class="trooper-type">${capitalise(trooper.trooper_type)}</div>
            </div> 
            <div class="icons">
                <!-- <input type="text" placeholder="Enter reason for absence"> -->
                <div class="edit-icon"><i class="fas fa-calendar-times fa-2x absent hidden"></i></div>
                <div class="edit-icon"><i class="fas fa-calendar-check fa-2x present"></i></div>
                <button class="swap-button edit-btn">Edit Trooper</button>
                <button class="swap-button" style="background-color: red;">Archive</button>
                <div class="overlay hidden"></div>
                <form action="" class="trooper-form edit-form page">
                    <span class="modalClose">&times;</span>
                    <h2>Edit Trooper</h2>
                    <input type="hidden" name="edit-trooper-id" value=${trooper.id}>
                    <div class="field">
                        <div class="label">Name</div>
                        <input type="text" name="edit-trooper-name" value=${trooper.name} required>
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
                            <input type="radio" name="edit-trooper-is-permanent" id="edit-trooper-permanent-${i}" class="option-1-input" value="true" ${trooper.is_permanent ? 'checked' : ''}>
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
        trooperInfoElement.innerHTML = liInnerHtml;
        editTrooperList.appendChild(trooperInfoElement);
    }
    
    // change display text - "displaying n troopers" --> change the n
    const displayText = document.querySelector(".first-row em");
    displayText.textContent = `Displaying ${troopers.length} troopers`
    reloadLightboxes('.edit-btn', '.edit-form');
    
    // Add event listeners to manage the submitting of edit forms
    editFormsOnSubmit();

    

}


document.addEventListener("DOMContentLoaded", async function() {
    await getTroopers();

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
            alert(result);
            await getTroopers();
        } catch (error) {
            console.log(error)
        }
        
    })

})
