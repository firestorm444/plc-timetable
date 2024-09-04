const nested_icon_container_list = [['.edit-trooper-btn', '.edit-trooper-form'], ['.edit-role-btn', '.edit-role-form']]
const single_icon_container_list = [['.add-trooper-btn', '.add-trooper-form'], ['.add-role-btn', '.add-role-form']];
const icon_container_list = nested_icon_container_list.concat(single_icon_container_list);

function addLightboxes() {
  nested_icon_container_list.forEach(element => {
    var iconName = element[0];
    var containerName = element[1];
    $(iconName).click(function(event) {
      event.preventDefault();
      $(this).siblings(containerName).fadeIn(350);
      $(this).siblings(containerName).prev('.overlay').fadeIn(350);
    });
  })

  single_icon_container_list.forEach(element => {
    var iconName = element[0];
    var containerName = element[1];
    $(iconName).click(function(event) {
      $(containerName).fadeIn();
      $(containerName).prev('.overlay').fadeIn(350);
    });
  })

  icon_container_list.forEach(element => {
    var containerName = element[1];
    $(document).mousedown(function (event) {
      var container = $(containerName);
      if ((!container.is(event.target) // if the target of the click isn't the container...
          && !$(event.target).closest(containerName).length)
          || ($(event.target).hasClass('modalClose')))
      {
        container.prev('.overlay').fadeOut(350);
        container.fadeOut(350);
      }
    });
  })
}

function reloadLightboxes(iconName, containerName) {
  $(iconName).click(function(event) {
      event.preventDefault();
      $(this).siblings(containerName).fadeIn(350);
      $(this).siblings(containerName).prev('.overlay').fadeIn(350);
    });
  
  $(document).mousedown(function (event) {
      var container = $(containerName);
      if ((!container.is(event.target) // if the target of the click isn't the container...
          && !$(event.target).closest(containerName).length)
          || ($(event.target).hasClass('modalClose')))
      {
          container.prev('.overlay').fadeOut(350);
          container.fadeOut(350);
      }
  });
}

function capitalise(string) {
  return string.replace(/^./, string[0].toUpperCase())
}

function displayFlashMessage(message, type) {
  const successMessage = document.querySelector('.success-msg');
  const errorMessage = document.querySelector('.error-msg');
  if (type=="success") {
      successMessage.classList.remove('hidden');
      errorMessage.classList.add('hidden');
      successMessage.querySelector('span').textContent = message;
      setTimeout(() => {
          successMessage.classList.add('hidden');
      }, 3000)
      
  } else {
      successMessage.classList.add('hidden');
      errorMessage.classList.remove('hidden');
      errorMessage.querySelector('span').textContent = message;
      setTimeout(() => {
          errorMessage.classList.add('hidden');
      }, 3000)
  }
}

$(document).ready(addLightboxes);