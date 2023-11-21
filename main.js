import { places } from "./places.js";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

for (const [label, value] of urlParams) {
  const el = document.getElementById(label);
  if (!el) continue;
  switch (label) {
    case "auto-bead":
      el.checked = true;
      break;
    default:
    case "period":
      el.value = value;
      break;
  }
}

const place_list = document.getElementById("place-list");
const place_hidden_select = document.getElementById("place-hidden-select");

let place_id_selected = places[0].id;

places.map((place, i) => {
  const img = `<img class="rounded" src="${place.img}" alt="" />`;
  const span = `<span class="text-sm">${place.span}</span>`;

  const option = document.createElement("option");
  option.value = place.id;
  place_hidden_select.appendChild(option);

  const div = document.createElement("div");
  div.id = place.id;
  div.className =
    "cursor-pointer inline-block mx-2 bg-white w-1/3 h-full rounded shadow px-2 py-2";
  div.innerHTML = img + span;
  place_list.appendChild(div);

  const curr = document.getElementById(place.id);

  if (!i) {
    curr.style.border = "2px solid green";
    place_id_selected = place.id;
  }

  curr.addEventListener("click", () => {
    const old = place_list.querySelector("#" + place_id_selected);
    old.style.border = "";
    curr.style.border = "2px solid green";
    place_id_selected = place.id;
    place_hidden_select.value = place.id;
  });
});

document.getElementById("start-btn").addEventListener("submit", () => {
  console.log(place_id_selected);
});
