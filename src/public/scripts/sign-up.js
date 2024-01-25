var input = document.getElementById("image-input");
var preview = document.getElementById("image-preview");

function previewImage() {
  if (input.files && input.files[0]) {
    var reader = new FileReader();

    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
    };

    reader.readAsDataURL(input.files[0]);
  }
}

preview.addEventListener("click", (e) => {
  input.click();
});

input.onchange = previewImage;

htmx.on("#sign-up-form", "htmx:xhr:progress", function (evt) {
  htmx
    .find("#progress")
    .setAttribute("value", (evt.detail.loaded / evt.detail.total) * 100);
});
