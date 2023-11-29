import { places } from "./map.js";

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
  const span = `<p class="text-sm ">${place.span}</p>`;

  const option = document.createElement("option");
  option.value = place.id;
  place_hidden_select.appendChild(option);

  const div = document.createElement("div");
  div.id = place.id;
  div.className =
    "cursor-pointer inline-block bg-white h-full rounded shadow mx-2 px-2 py-2";
  div.style.width = "200px";

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

const days = [
  "IV. Mysteria gloriosa (In feria quarta et Dominica)",
  "I. Mysteria Gaudiosa (In feria secunda et sabbato)",
  "III. Mysteria dolorosa (In feria tertia et feria sexta)",
  "IV. Mysteria gloriosa (In feria quarta et Dominica)",
  "II. Mysteria Luminosa (In feria quinta)",
  "III. Mysteria dolorosa (In feria tertia et feria sexta)",
  "I. Mysteria Gaudiosa (In feria secunda et sabbato)",
];
const d = days[new Date().getDay()];
document.getElementById("day").innerText = d;

const mysteria = {
  I: "<li>Quem, Virgo, concepisti. [Mt 1:18, Lc 1:26-38];</li> <li>Quem visitando Elisabeth portasti. [Lc 1:39-45];</li> <li>Quem, Virgo, genuisti. [Lc 2:6-12];</li> <li>Quem in templo præsentasti. [Lc 2:25-32];</li> <li>Quem in templo invenisti. [Lc 2:41-50].</li>",
  II: "<li>Qui apud Iordanem baptizatus est. [Mt 3:13, Mc 1:9, Jn 1:29];</li> <li>Qui ipsum revelavit apud Canense matrimonium. [In 2:1-11];</li> <li>Qui Regnum Dei annuntiavit. [Mc 1:15, Lc 10:8-11];</li> <li>Qui transfiguratus est. [Mt 17:1-8, Mc 9:2-9];</li> <li>Qui Eucharistiam instituit.[In 6:27-59, Mt 26:26-29, Mc 14:22-24, Lc 22:15-20].</li>",
  III: "<li>Qui pro nobis sanguinem sudavit. [Lc 22:39-46];</li> <li>Qui pro nobis flagellatus est. [Mt 27:26, Mc 15:6-15, In 19:1];</li> <li>Qui pro nobis spinis coronatus est. [In 19:1-8];</li> <li>Qui pro nobis crucem baiulavit. [In 19:16-22];</li> <li>Qui pro nobis crucifixus est. [In 19:25-30].</li>",
  IV: "<li>Qui resurrexit a mortuis. [Mc 16:1-7];</li> <li>Qui in cælum ascendit. [Lc 24:46-53];</li> <li>Qui Spiritum Sanctum misit. [Acta 2:1-7];</li> <li>Qui te assumpsit. [Ps 16:10];</li> <li>Qui te in cælis coronavit. [Apoc 12:1].</li>",
};

document.getElementById("mysterium").innerHTML = mysteria[d.split(".")[0]];
