function addRoleTimingToContainer(parentElement, weekdayText, weekdayValue, timingText, timingValue) {
    const savedRoleTimingElement = document.createElement('div');
    savedRoleTimingElement.innerHTML = `
        <span>&times;</span>
        <div>${weekdayText + ' ' + timingText}</div>
    `
    savedRoleTimingElement.dataset.weekday = weekdayValue;
    savedRoleTimingElement.dataset.timing = timingValue;
    savedRoleTimingElement.classList.add('saved-role-timing');
    
    const savedRoleTimingContainer = parentElement.querySelector('.saved-role-timings-container');
    savedRoleTimingContainer.appendChild(savedRoleTimingElement);

    savedRoleTimingElement.querySelector('span').addEventListener('click', function() {
        savedRoleTimingElement.remove();
    })
}


function saveRoleTiming(formElement) {
    const addRoleTimingBtn = formElement.querySelector('.add-role-timing');
    addRoleTimingBtn.addEventListener('click', function() {
        const weekdaySelect = formElement.querySelector('.add-role-weekday');
        const timeSelect = formElement.querySelector('.add-role-time');

        const weekdaySelectOption = weekdaySelect.options[weekdaySelect.selectedIndex];
        const timeSelectOption = timeSelect.options[timeSelect.selectedIndex];

        console.log(weekdaySelectOption.value, timeSelectOption.value)
        addRoleTimingToContainer(formElement, weekdaySelectOption.text, weekdaySelectOption.value, timeSelectOption.text, timeSelectOption.value);
    })
}


function roleFormOnSubmit(type, roleForm) {
    // Manage the submit of add role form
    // const addRoleForm = document.querySelector('.add-role-form');
    roleForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        const formElements = roleForm.elements;
        const roleName = formElements.namedItem(`${type}-role-name`).value;
        const roleColor = formElements.namedItem(`${type}-role-color`).value;
        const isStanding = formElements.namedItem(`${type}-role-is-standing`).value === "true";
        const isCounted = formElements.namedItem(`${type}-role-is-counted`).value === "true";
        const isCustom = formElements.namedItem(`${type}-role-is-custom`).value === "true";

        const roleTimingElements = roleForm.querySelectorAll('.saved-role-timings-container .saved-role-timing');
        if (roleTimingElements.length == 0) {
            alert('Please input at least 1 role timing');
            return false;
        }

        const roleTimings = [];
        roleTimingElements.forEach(element => {
            roleTimings.push([element.dataset.weekday, element.dataset.timing])
        });

        const roleInfo = {
            "name": roleName,
            "color": roleColor,
            "is_standing": isStanding,
            "is_counted_in_hours": isCounted,
            "is_custom": isCustom,
            "role_timings": roleTimings
        }

        if (type === "edit") {
            roleInfo.id = Number(formElements.namedItem("edit-role-id").value)
        }

        console.log(roleInfo);

        try {
            if (type === "add") {
                var result = await eel.add_role(roleInfo)();
                roleForm.reset()
            } else if (type === "edit") {
                var result = await eel.edit_role(roleInfo)();
            }
            
            roleForm.previousElementSibling.style.display = 'none';
            roleForm.style.display = 'none';
            displayFlashMessage(result, "success");
            await loadPage();
        } catch (error) {
            displayFlashMessage(error.errorText, "error");
        }

    })
}


function setRoles(roles, rolesListId) {
    const rolesList = document.querySelector(rolesListId);

    // Clear the role list except for first row
    const elementsToDelete = rolesList.querySelectorAll('.trooper-info');
    elementsToDelete.forEach(element => {
        element.remove();
    });

    // Create the li element and append the info to it
    for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        var liInnerHtml = `
            <div class="info-text">
                <strong>${capitalise(role.name)}</strong>
            </div>
            <div class="icons">
                <button class="swap-button edit-role-btn">Edit Role</button>
                <button class="swap-button delete-btn" style="background-color: red;">Delete</button>
                <div class="overlay hidden"></div>
                <form action="" class="trooper-form edit-role-form page">
                    <span class="modalClose">&times;</span>
                    <h2>Edit Role</h2>
                    <input type="hidden" name="edit-role-id" value=${role.id}>
                    <div class="field">
                        <div class="label">Name</div>
                        <input type="text" name="edit-role-name" value="${role.name}" required>
                    </div>
                    <div class="field">
                        <div class="label">Colour</div>
                        <input type="color" name="edit-role-color" value="${role.color}" required>
                    </div>
                    
                    <div class="field">
                        <div class="label">Standing Role</div>
                        <div class="toggle-switch">
                            <input type="radio" name="edit-role-is-standing" id="edit-role-is-standing-yes-${i}" class="option-1-input" value="true" ${(role.is_standing) ? 'checked' : ''}>
                            <input type="radio" name="edit-role-is-standing" id="edit-role-is-standing-no-${i}" class="option-2-input" value="false" ${(!role.is_standing) ? 'checked' : ''}>
                                <label for="edit-role-is-standing-yes-${i}" class="option option-1-label">
                                <div class="dot"></div>
                                    <span>Yes</span>
                                    </label>
                                <label for="edit-role-is-standing-no-${i}" class="option option-2-label">
                                <div class="dot"></div>
                                    <span>No</span>
                                </label>
                        </div>
                    </div>

                    <div class="field">
                        <div class="label">Counted in hours</div>
                        <div class="toggle-switch">
                            <input type="radio" name="edit-role-is-counted" id="edit-role-is-counted-yes-${i}" class="option-1-input" value="true" ${(role.is_counted_in_hours) ? 'checked' : ''}>
                            <input type="radio" name="edit-role-is-counted" id="edit-role-is-counted-no-${i}" class="option-2-input" value="false" ${(!role.is_counted_in_hours) ? 'checked' : ''}>
                                <label for="edit-role-is-counted-yes-${i}" class="option option-1-label">
                                    <div class="dot"></div>
                                        <span>Yes</span>
                                </label>
                                <label for="edit-role-is-counted-no-${i}" class="option option-2-label">
                                    <div class="dot"></div>
                                        <span>No</span>
                                </label>
                        </div>
                    </div>

                    <div class="field">
                        <div class="label">Custom/Uncommon Role</div>
                        <div class="toggle-switch">
                            <input type="radio" name="edit-role-is-custom" id="edit-role-is-custom-yes-${i}" class="option-1-input" value="true" ${(role.is_custom) ? 'checked' : ''}>
                            <input type="radio" name="edit-role-is-custom" id="edit-role-is-custom-no-${i}" class="option-2-input" value="false" ${(!role.is_custom) ? 'checked' : ''}>
                                <label for="edit-role-is-custom-yes-${i}" class="option option-1-label">
                                    <div class="dot"></div>
                                    <span>Yes</span>
                                </label>
                                <label for="edit-role-is-custom-no-${i}" class="option option-2-label">
                                    <div class="dot"></div>
                                    <span>No</span>
                                </label>
                        </div>
                    </div>

                    <div>
                        <div class="label">Role timings</div>
                        <div class="saved-role-timings-container"></div>
                        <div class="weekday-time-pair">
                            <select class="add-role-weekday">
                                <option value="all-week">All-week</option>
                                <option value="monday">Monday</option>
                                <option value="tuesday">Tuesday</option>
                                <option value="wednesday">Wednesday</option>
                                <option value="thursday">Thursday</option>
                                <option value="friday">Friday</option>
                            </select>

                            <select class="add-role-time">
                                <option value="all-day">All-day</option>
                                <option value="0600">0600</option>
                                <option value="0700">0700</option>
                                <option value="0800">0800</option>
                                <option value="0900">0900</option>
                                <option value="1000">1000</option>
                                <option value="1100">1100</option>
                                <option value="1200">1200</option>
                                <option value="1300">1300</option>
                                <option value="1400">1400</option>
                                <option value="1500">1500</option>
                                <option value="1600">1600</option>
                                <option value="1700">1700</option>
                            </select>
                            
                            <button type="button" class="swap-button add-role-timing" style="background-color: teal;">Add Timing</button>
                        </div>

                    </div>

                    <div class="btn-field trooper-submit-btn">
                        <button class="firstNext next" type="submit">Submit</button>
                    </div>
                </form>
            </div>
        `
        // Add the elements to the list
        const roleInfoElement = document.createElement('li');
        roleInfoElement.classList.add('trooper-info');
        roleInfoElement.dataset.id = role.id;
        roleInfoElement.innerHTML = liInnerHtml;
        rolesList.appendChild(roleInfoElement);

        // Add the role timings
        for (let j = 0; j < role.role_timings.length; j++) {
            const roleTiming = role.role_timings[j];
            console.log(capitalise(roleTiming[0]))
            addRoleTimingToContainer(roleInfoElement, capitalise(roleTiming[0]), roleTiming[0], capitalise(roleTiming[1]), roleTiming[1]);
        }

        // Allow save role timing functionality
        saveRoleTiming(roleInfoElement)

        // Add onsubmit edit form
        const editForm = roleInfoElement.querySelector('.edit-role-form');
        roleFormOnSubmit('edit', editForm);

        // Add onDelete
        const deleteBtn = roleInfoElement.querySelector('.delete-btn')
        deleteBtn.addEventListener('click', async function() {
            let confirmation = confirm('Are you sure you want to delete the role?');
            if (confirmation) {
                try {
                    var roleId = Number(roleInfoElement.dataset.id);
                    var result = await eel.delete_role(roleId)();
                    displayFlashMessage(result, "success");
                    await loadPage();
                } catch (error) {
                    displayFlashMessage(error.errorText, "error");
                }
            }
        })
    }
    // change display text - "displaying n troopers" --> change the n
    const displayText = rolesList.querySelector('.first-row em');
    displayText.textContent = `Displaying ${roles.length} roles`



}

async function loadPage() {
    try {
        const result = await eel.get_roles()();
        const normalRoles = result[0];
        const customRoles = result[1];

        setRoles(normalRoles, '#edit-normal-role-list');
        setRoles(customRoles, '#edit-custom-role-list')
        addLightboxes();
        window.scrollTo(0,0);

    } catch (error) {
        displayFlashMessage(error.errorText, "error");
    }
}




document.addEventListener('DOMContentLoaded', function() {
    const addRoleForm = document.querySelector('.add-role-form');
    roleFormOnSubmit('add', addRoleForm);
    loadPage();
    saveRoleTiming(addRoleForm);
})