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

document.addEventListener('DOMContentLoaded', function() {
    const addRoleForm = document.querySelector('.add-role-form');
    saveRoleTiming(addRoleForm)
})