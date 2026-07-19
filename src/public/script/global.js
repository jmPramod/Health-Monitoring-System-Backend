const open_model = document.getElementById("modelOpen");
const model_container = document.getElementById("model-container");
const close_model = document.getElementById("modelClose");
console.log(open_model, model_container, close_model);

open_model.addEventListener("click", function () {
  console.log("open", model_container.classList);

  model_container.classList.add("show");
});

close_model.addEventListener("click", function () {
  console.log("close");
  model_container.classList.remove("show");
});
