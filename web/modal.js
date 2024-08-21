const nested_icon_container_list = [['.edit-btn', '.edit-form']]
const single_icon_container_list = [['.add-btn', '.add-form']];
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

// $(document).ready(addLightboxes);