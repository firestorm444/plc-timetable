
document.addEventListener("DOMContentLoaded", function() {
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
            "name": trooperName,
            "trooper_type": trooperType,
            "status": trooperStatus,
            "is_permanent": isPermanent,
            "archived": false,
            "excuse_rmj": excuseRMJ
        }

        try {
            var result = await eel.add_trooper(trooperInfo)();
            alert(result);
        } catch (error) {
            console.log(error)
        }
        
    })

})
