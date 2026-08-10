const open_model = document.getElementById("modelOpen");
const model_container = document.getElementById("model-container");
const close_model = document.getElementById("modelClose");

open_model.addEventListener("click", () => {
  model_container.classList.remove("hidden");
  model_container.classList.add("flex");
});

close_model.addEventListener("click", () => {
  model_container.classList.remove("flex");
  model_container.classList.add("hidden");
});
