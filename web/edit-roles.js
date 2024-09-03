function saveRoleTiming(formElement) {
    const addRoleTimingBtn = formElement.querySelector('.add-role-timing');
    addRoleTimingBtn.addEventListener('click', function() {
        const weekdaySelect = formElement.querySelector('.add-role-weekday');
        const timeSelect = formElement.querySelector('.add-role-time');

        const weekdaySelectOption = weekdaySelect.options[weekdaySelect.selectedIndex];
        const timeSelectOption = timeSelect.options[timeSelect.selectedIndex];

        console.log(weekdaySelectOption.value, timeSelectOption.value)


        const savedRoleTimingElement = document.createElement('div');
        savedRoleTimingElement.innerHTML = `
            <span>&times;</span>
            <div>${weekdaySelectOption.text + ' ' + timeSelectOption.text}</div>
        `
        savedRoleTimingElement.dataset.weekday = weekdaySelectOption.value;
        savedRoleTimingElement.dataset.timing = timeSelectOption.value;
        savedRoleTimingElement.classList.add('saved-role-timing');
        
        const savedRoleTimingContainer = formElement.querySelector('.saved-role-timings-container');
        savedRoleTimingContainer.appendChild(savedRoleTimingElement);

        savedRoleTimingElement.querySelector('span').addEventListener('click', function() {
            savedRoleTimingElement.remove();
        })
    })
}


function addRoleFormOnSubmit() {
    // Manage the submit of add role form
    const addRoleForm = document.querySelector('.add-role-form');
    addRoleForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        const formElements = addRoleForm.elements;
        const roleName = formElements.namedItem("add-role-name").value;
        const roleColor = formElements.namedItem("add-role-color").value;
        const isStanding = formElements.namedItem("add-role-is-standing").value === "true";
        const isCounted = formElements.namedItem("add-role-is-counted").value === "true";
        const isCustom = formElements.namedItem("add-role-is-custom").value === "true";

        const roleTimingElements = addRoleForm.querySelectorAll('.saved-role-timings-container .saved-role-timing');
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

        console.log(roleInfo);

        try {
            var result = await eel.add_role(roleInfo)();
            alert(result);
            // addTrooperForm.previousElementSibling.style.display = 'none';
            // addTrooperForm.style.display = 'none';
            // displayFlashMessage(result, "success");
            // await loadPage();
        } catch (error) {
            displayFlashMessage(error.errorText, "error");
        }

    })
}

function setNormalRoles(normalRoles) {
    const normalRolesList = document.querySelector('#edit-role-list');

    // Clear the role list except for first row
    const elementsToDelete = normalRolesList.querySelectorAll('.trooper-info');
    elementsToDelete.forEach(element => {
        element.remove();
    });

    // Create the li element and append the info to it
    for (let i = 0; i < normalRoles.length; i++) {
        const normalRole = normalRoles[i];
        var liInnerHtml = `
            
        
        
        
        `
        
    }
}

async function loadPage() {
    try {
        const result = await eel.get_roles()();
        const normalRoles = result[0];
        const customRoles = result[1];
        console.log(normalRoles, customRoles)

        // setNormalRoles(normalRoles);
        // setCustomRoles(customRoles);
        addLightboxes();
        window.scrollTo(0,0);

    } catch (error) {
        displayFlashMessage(error.errorText, "error");
    }
}




document.addEventListener('DOMContentLoaded', function() {
    const addRoleForm = document.querySelector('.add-role-form');
    addRoleFormOnSubmit();
    loadPage();
    saveRoleTiming(addRoleForm)
})