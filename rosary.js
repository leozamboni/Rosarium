import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/addons/renderers/CSS2DRenderer.js";
import { Places, Rosaries } from "./map.js";
import * as Translations from "./translations";

THREE.DefaultLoadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
  document.body.insertAdjacentHTML(
    "beforebegin",
    '<p id="loading-text" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">Loading...<p>'
  );
};

THREE.DefaultLoadingManager.onLoad = function () {
  const e = document.getElementById("loading-text");
  e.parentNode.removeChild(e);
  rosarium.startProgressBar();
};

document.getElementById("reload-btn").style.display = "none";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

for (const [label, value] of urlParams) {
  const el = document.getElementById(label);
  if (!el) continue;
  switch (label) {
    case "chaplet":
      el.checked = true;
      break;
    default:
    case "period":
      el.value = value;
      break;
  }
}

class Config {
  constructor() {
    if (urlParams.get("bead-time") !== "") {
      this.beadTime = Number(urlParams.get("bead-time").replace(/[^0-9]/g, ""));
    } else {
      document.getElementById("pause-btn").style.display = "none";
    }
    this.chaplet = urlParams.get("chaplet") === "on" ? true : false;
    this.jaculatorium = urlParams.get("jaculatorium");
    this.uiLanguage = urlParams.get("ui-language");
    this.fontSize = urlParams.get("font-size");
    this.place = urlParams.get("place");
    this.placeTextureQuality = urlParams.get("place-texture-quality");
    this.rosaryTextureQuality = urlParams.get("rosary-texture-quality");
    this.rosary = urlParams.get("rosary");
    this.translation = urlParams.get("translation");
  }
}

class Translates {
  constructor() {
    this.en = Translations.EN;
    this["pt-br"] = Translations.PTBR;
  }
}

class Utils {
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

class Three {
  scene;
  camera;
  renderer;
  controls;
  raycaster;
  mouse;
  labelRenderer;
  rosaryNodes;
  constructor() {
    this.scene = new THREE.Scene();
    if (Rosarium.isDevMode()) {
      this.scene.add(new THREE.AxesHelper(10));
    }

    this.camera = new THREE.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );
    this.camera.position.set(0, -0.3, 2.7);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.setClearColor(0xeeeeee);
    document.body.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = "absolute";
    this.labelRenderer.domElement.style.top = "0px";
    document.body.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(
      this.camera,
      this.labelRenderer.domElement
    );
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.maxDistance = 40;
    this.controls.minDistance = 1.5;

    this.raycaster = new THREE.Raycaster();

    this.mouse = new THREE.Vector2();

    this.rosaryNodes = [];
  }
  createLight(color, intensity, callback) {
    const light = new THREE.DirectionalLight(color, intensity);
    callback && callback(light);
    this.scene.add(light);
    if (Rosarium.isDevMode()) {
      const helper = new THREE.DirectionalLightHelper(light, 5);
      this.scene.add(helper);
    }
  }
  createNode(size, callback) {
    const geometry = new THREE.SphereGeometry(size, 32, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: Rosarium.isDevMode() ? 0.5 : 0,
    });
    const sphere = new THREE.Mesh(geometry, material);
    callback && callback(sphere);
    // sphere.name = "hitbox";
    this.scene.add(sphere);
    this.rosaryNodes.push(sphere);
  }
  loadGLTFModel(place, quality, callback) {
    if (!place) throw new Error("Resource not found");

    try {
      const modelDir = "models/" + place.id + "/" + quality;

      var self = this;
      new GLTFLoader().load(modelDir, async function (gltf) {
        const _model = gltf.scene;
        callback && callback(_model);

        await self.renderer.compileAsync(_model, self.camera, self.scene);

        self.scene.add(_model);
      });
    } catch (e) {
      throw new Error(e);
    }
  }
  eventResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.render();
  }
  animate() {
    this.controls.update();
    this.render();
  }
  render() {
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
}

class Rosarium {
  static mode = "";

  three;
  config;
  elements;

  skipTo;

  currentNodeIndex = 0;
  lastNodeIndex = 0;

  paused = false;
  pausedPercent = 0;

  fatherNodeLabel = 0;
  fatherNodeIndex = 0;

  days = [
    "III. Mysteria gloriosa (Dominica)",
    "I. Mysteria Gaudiosa (Feria Secunda)",
    "II. Mysteria dolorosa (Feria Tertia)",
    "III. Mysteria gloriosa (Feria Quarta)",
    "I. Mysteria Gaudiosa (Feria Quinta)",
    "II. Mysteria dolorosa (Feria Sexta)",
    "III. Mysteria gloriosa (Sabbato)",
  ];
  currDay;

  mysteria = {
    I: [
      "Quem, Virgo, concepisti. [Mt 1:18, Lc 1:26-38]",
      "Quem visitando Elisabeth portasti. [Lc 1:39-45]",
      "Quem, Virgo, genuisti. [Lc 2:6-12]",
      "Quem in templo præsentasti. [Lc 2:25-32]",
      "Quem in templo invenisti. [Lc 2:41-50]",
    ],
    II: [
      "Qui pro nobis sanguinem sudavit. [Lc 22:39-46]",
      "Qui pro nobis flagellatus est. [Mt 27:26, Mc 15:6-15, In 19:1]",
      "Qui pro nobis spinis coronatus est. [In 19:1-8]",
      "Qui pro nobis crucem baiulavit. [In 19:16-22]",
      "Qui pro nobis crucifixus est. [In 19:25-30]",
    ],
    III: [
      "Qui resurrexit a mortuis. [Mc 16:1-7]",
      "Qui in cælum ascendit. [Lc 24:46-53]",
      "Qui Spiritum Sanctum misit. [Acta 2:1-7]",
      "Qui te assumpsit. [Ps 16:10]",
      "Qui te in cælis coronavit. [Apoc 12:1]",
    ],
  };
  currMysterium;

  prays = {
    "Oratio Fatima":
      "O mi Iesu, dimitte nobis debita nostra, libera nos ab igne inferni, conduc in cælum omnes animas, præsertim illas quæ maxime indigent misericordia tua.",
    "Doxologia Minor":
      "Gloria Patri, et Filio, et Spiritui Sancto. Sicut erat in principio, et nunc, et semper, et in sæcula sæculorum. Amen.",
    Mysterium: () =>
      "Mysterium: " +
      this.currMysterium[Math.round(this.currentNodeIndex / 10) - 1],
    "Salve, Regina":
      "Salve, Regina, mater misericordiæ, vita, dulcedo, et spes nostra, salve. Ad te clamamus exsules filii Hevæ. Ad te suspiramus, gementes et flentes in hac lacrimarum valle. Eia, ergo, advocata nostra, illos tuos misericordes oculos ad nos converte. Et Iesum, benedictum fructum ventris tui, nobis post hoc exsilium ostende. O clemens, O pia, O dulcis Virgo Maria.",
    Jaculatorium: () => this.config.jaculatorium,
    Credo:
      "Credo in Deum Patrem omnipotentem, Creatorem cæli et terræ. Et in Iesum Christum, Filium eius unicum, Dominum nostrum, qui conceptus est de Spiritu Sancto, natus ex Maria Virgine, passus sub Pontio Pilato, crucifixus, mortuus, et sepultus, descendit ad inferos, tertia die resurrexit a mortuis, ascendit ad cælos, sedet ad dexteram Dei Patris omnipotentis, inde venturus est iudicare vivos et mortuos. Credo in Spiritum Sanctum, sanctam Ecclesiam catholicam, sanctorum communionem, remissionem peccatorum, carnis resurrectionem, vitam æternam. Amen.",
    "Pater Noster":
      "Pater Noster, qui es in cælis, sanctificetur nomen tuum. Adveniat regnum tuum. Fiat voluntas tua, sicut in cælo et in terra. Panem nostrum quotidianum da nobis hodie, et dimitte nobis debita nostra sicut et nos dimittimus debitoribus nostris. Et ne nos inducas in tentationem, sed libera nos a malo. Amen.",
    "Ave Maria":
      "Ave Maria, gratia plena, Dominus tecum. Benedicta tu in mulieribus, et benedictus fructus ventris tui, Iesus. Sancta Maria, Mater Dei, ora pro nobis peccatoribus, nunc, et in hora mortis nostræ. Amen.",
  };

  constructor() {
    this.three = new Three();
    this.utils = new Utils();
    this.config = new Config();
    this.translations = new Translates();
    this.elements = {
      orandi: document.getElementById("orandi"),
      progressBar: document.getElementById("progress-bar"),
      pauseBtn: document.getElementById("pause-btn"),
      placeTitle: document.getElementById("place-title"),
      rosaryTitle: document.getElementById("rosary-title"),
    };

    this.currDay = this.days[new Date().getDay()];
    if (!this.config.chaplet) {
      this.currMysteriumIndex = 1;
      this.currDay = this.days[this.currMysteriumIndex];
    }

    this.currMysterium = this.mysteria[this.currDay.split(".")[0]];

    try {
      this.place = Places.find((place) => place.id === this.config.place);
      this.rosary = Rosaries.find((rosary) => rosary.id === this.config.rosary);
    } catch {
      throw new Error("3D load failed");
    }
    this.isMobile = window.innerWidth <= 1000;
  }
  configure() {
    this.elements.orandi.style.fontSize = this.config.fontSize;
    if (this.config.beadTime) {
      this.elements.progressBar.style.display = "block";
    }

    if (this.config.translation) {
      try {
        this.translation = this.translations[this.config.translation];
      } catch (e) {
        throw new Error("Translation not found");
      }
    }

    this.elements.placeTitle.innerText = `Place: ${
      this.place.title
    } (${this.config.placeTextureQuality.replace(".glb", "")})`;
    this.elements.rosaryTitle.innerText = `Rosary: ${
      this.rosary.title
    } (${this.config.rosaryTextureQuality.replace(".glb", "")})`;

    if (this.isMobile) {
      const icons = document.getElementsByTagName("svg");
      const ul = document.getElementsByTagName("ul")[0];
      const leftbar = document.getElementById("leftbar");
      leftbar.style.width = "100vw";
      ul.classList.add("mr-[80px]");

      this.elements.orandi.style.fontSize =
        Number(this.config.fontSize.replace("pt", "")) * 2 + "pt";

      for (let icon of icons) {
        icon.classList = [];
        icon.classList.add("mt-[50px]");
        icon.classList.add("w-[50px]");
        icon.classList.add("h-[50px]");
      }
    }
  }
  static isDevMode() {
    return this.mode === "dev";
  }
  async startProgressBar() {
    this.selectNode(0);
    if (this.config.beadTime) {
      const p = await progressBarRound(0, this.config.beadTime);
      if (p) {
        return;
      }

      for (let i = 1; i < nodesPos.length - 1; i++) {
        this.selectNode(i);
        const p = await progressBarRound(0, this.config.beadTime);
        if (p) {
          return;
        }
      }
    }
  }
  async continueProgressBar() {
    let i = this.currentNodeIndex;
    let pausedNode = i;
    if (this.fatherNodeLabel) {
      this.fatherNodeLabel--;
    }
    for (; i < nodesPos.length - 1; i++) {
      this.selectNode(i);
      let p;
      if (i === pausedNode) {
        p = await progressBarRound(0, this.config.beadTime, this.pausedPercent);
      } else {
        p = await progressBarRound(0, this.config.beadTime);
      }

      if (p) {
        return;
      }
    }
  }
  resetProgressBar() {
    if (!rosarium.paused) {
      this.skipTo = this.currentNodeIndex;
    }
  }
  selectNode(i) {
    if (this.fatherNodeLabel) {
      i = this.fatherNodeIndex;
    } else {
      this.lastNodeIndex = this.currentNodeIndex;
    }

    this.currentNodeIndex = i;

    const object = this.three.rosaryNodes[i];

    const label = this.getLabel(i);
    const cubeDiv = document.createElement("pre");
    cubeDiv.className = "label";

    if (this.isMobile) {
      cubeDiv.style.fontSize =
        Number(this.config.fontSize.replace("pt", "")) * 2 + "pt";
    }

    cubeDiv.textContent = label;

    const pray = this.getPray(label);

    let split = pray.split(" ");
    var html = "";
    for (let i = 0; i < split.length; i++) {
      const lower = split[i].replace(/[.,:\s]/g, "").toLowerCase();
      let translated = this.translation[lower];
      if (translated && /^[A-Z]*$/.test(split[i][0])) {
        translated = this.utils.capitalizeFirstLetter(translated);
      }

      html += `
      <span class="tooltip">${split[i]} ${
        translated
          ? `
        <span class="tooltiptext">  
        <svg class="flex float-left" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
<path fill="#CFD8DC" d="M15,13h25c1.104,0,2,0.896,2,2v25c0,1.104-0.896,2-2,2H26L15,13z"></path><path fill="#546E7A" d="M26.832,34.854l-0.916-1.776l0.889-0.459c0.061-0.031,6.101-3.208,9.043-9.104l0.446-0.895l1.79,0.893l-0.447,0.895c-3.241,6.496-9.645,9.85-9.916,9.989L26.832,34.854z"></path><path fill="#546E7A" d="M38.019 34l-.87-.49c-.207-.116-5.092-2.901-8.496-7.667l1.627-1.162c3.139 4.394 7.805 7.061 7.851 7.087L39 32.26 38.019 34zM26 22H40V24H26z"></path><path fill="#546E7A" d="M32 20H34V24H32z"></path><path fill="#2196F3" d="M33,35H8c-1.104,0-2-0.896-2-2V8c0-1.104,0.896-2,2-2h14L33,35z"></path><path fill="#3F51B5" d="M26 42L23 35 33 35z"></path><path fill="#FFF" d="M19.172,24h-4.36l-1.008,3H11l4.764-13h2.444L23,27h-2.805L19.172,24z M15.444,22h3.101l-1.559-4.714L15.444,22z"></path>
</svg>
        
        ${translated}
        </span>`
          : ""
      }</span> 
      `;
    }

    this.elements.orandi.innerHTML = html;

    const cubeLabel = new CSS2DObject(cubeDiv);

    object.add(cubeLabel);
    this.three.labelRenderer.render(this.three.scene, this.three.camera);
  }
  updateCurrMysterium() {
    this.currMysteriumIndex++;
    this.currDay = this.days[this.currMysteriumIndex];
    this.currMysterium = this.mysteria[this.currDay.split(".")[0]];
  }
  endRosarium() {
    document.getElementById("right-btn").style.display = "none";
    document.getElementById("left-btn").style.display = "none";
    document.getElementById("pause-btn").style.display = "none";
    document.getElementById("reload-btn").style.display = "";
    this.startProgressBar()
    rosarium.paused = true;
  }
  isPaterNoster() {
    return this.fatherNodeLabel >= 3;
  }
  isSalveRegina() {
    if (this.config.chaplet) {
      return (
        this.fatherNodeLabel === 2 &&
        this.lastNodeIndex === 60 &&
        this.currentNodeIndex === 5
      );
    } else {
      return (
        this.fatherNodeLabel === 2 &&
        this.lastNodeIndex === 60 &&
        this.currentNodeIndex === 5 &&
        this.currMysteriumIndex === 3
      );
    }
  }
  isNextMysterium() {
    return (
      this.config.chaplet === false &&
      this.lastNodeIndex === 60 &&
      this.currentNodeIndex === 5 &&
      this.currMysteriumIndex < 3
    );
  }
  isMysterium() {
    return this.fatherNodeLabel === 2;
  }
  isJaculatorium() {
    return this.fatherNodeLabel === 3 && this.config.jaculatorium?.length;
  }
  isOratioFatima() {
    return this.fatherNodeLabel === 1;
  }
  incNodeLabel() {
    this.fatherNodeLabel++;
  }
  enterNodeLabel() {
    this.fatherNodeIndex = this.currentNodeIndex;
  }
  exitNodeLabel() {
    this.fatherNodeLabel = 0;
  }
  endNodeLabel() {
    this.fatherNodeIndex = 0;
    this.exitNodeLabel();
  }
  nextMysterium() {
    this.updateCurrMysterium();
    this.endNodeLabel();
  }
  getLabel(i) {
    switch (i) {
      case 0:
        return "Credo";
      case 49:
      case 38:
      case 27:
      case 16:
      case 5:
        if (this.isNextMysterium()) {
          this.nextMysterium();
          return "Mysterium";
        }
        if (this.isOratioFatima()) {
          this.incNodeLabel();
          return "Oratio Fatima";
        }
        if (this.isSalveRegina()) {
          this.endNodeLabel();
          this.endRosarium();
          return "Salve, Regina";
        }
        if (this.isMysterium()) {
          this.incNodeLabel();
          return "Mysterium";
        }
        if (this.isJaculatorium()) {
          this.incNodeLabel();
          return "Jaculatorium";
        }
        if (this.isPaterNoster()) {
          this.exitNodeLabel();
          return "Pater Noster";
        }
        this.enterNodeLabel();
        this.incNodeLabel();
        return "Doxologia Minor";
      case 1:
        return "Pater Noster";
      default:
        return "Ave Maria";
    }
  }
  getPray(label) {
    const p = this.prays[label];
    if (typeof p === "function") {
      return p();
    }
    return p;
  }
  pause() {
    rosarium.paused = true;
    rosarium.elements.pauseBtn.innerHTML = `<svg width="20" height="20" style="color: white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 10 16"> <path d="M3.414 1A2 2 0 0 0 0 2.414v11.172A2 2 0 0 0 3.414 15L9 9.414a2 2 0 0 0 0-2.828L3.414 1Z"/> </svg>`;
  }
  play() {
    rosarium.paused = false;
    rosarium.elements.pauseBtn.innerHTML = `<svg width="20" height="20" style="color: white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 10 16" > <path fill-rule="evenodd" d="M0 .8C0 .358.32 0 .714 0h1.429c.394 0 .714.358.714.8v14.4c0 .442-.32.8-.714.8H.714a.678.678 0 0 1-.505-.234A.851.851 0 0 1 0 15.2V.8Zm7.143 0c0-.442.32-.8.714-.8h1.429c.19 0 .37.084.505.234.134.15.209.354.209.566v14.4c0 .442-.32.8-.714.8H7.857c-.394 0-.714-.358-.714-.8V.8Z" clip-rule="evenodd" /> </svg>`;
    rosarium.continueProgressBar();
  }
}

const rosarium = new Rosarium();
rosarium.configure();

async function progressBarRound(seconds, max, start_from) {
  let percent;
  if (start_from) {
    percent = start_from;
    seconds = max / (1 / start_from);
  } else {
    percent = (1 / max) * seconds;
  }
  rosarium.elements.progressBar.style.width = percent + "%";
  await new Promise((r) => setTimeout(r, 10));
  if (percent === 100) {
    return false;
  }
  if (rosarium.skipTo) {
    seconds = -1;
    rosarium.skipTo = undefined;
  }
  if (rosarium.paused) {
    rosarium.pausedPercent = percent;
    return true;
  }
  return await progressBarRound(++seconds, max);
}

rosarium.three.loadGLTFModel(
  rosarium.place,
  rosarium.config.placeTextureQuality,
  rosarium.place.callback,
);

rosarium.three.loadGLTFModel(
  rosarium.rosary,
  rosarium.config.rosaryTextureQuality,
  (model) => {
    model.scale.set(10, 10, 10);
    model.rotation.x = Math.PI / 2;
  }
);

rosarium.three.createLight(0xffffff, 3, (l) => {
  l.position.set(5, 5, 5);
});
rosarium.three.createLight(0xffffff, 3, (l) => {
  l.position.set(-5, 5, 5);
});
rosarium.three.createLight(0xffffff, 3, (l) => {
  l.position.set(0, 0, 10);
});

const nodesPos = [
  { size: 0.05, x: -0.025, y: -0.287, z: 0.04 },
  { size: 0.033, x: 0.02, y: -0.1, z: 0.04 },
  { size: 0.033, x: 0.1, y: -0.07, z: 0.04 },
  { size: 0.033, x: 0.16, y: -0.09, z: 0.04 },
  { size: 0.033, x: 0.21, y: -0.12, z: 0.04 },
  { size: 0.033, x: 0.33, y: -0.09, z: 0.04 }, // pai nosso, salve rainha
  { size: 0.033, x: 0.33, y: 0.02, z: 0.04 },
  { size: 0.033, x: 0.31, y: 0.08, z: 0.04 },
  { size: 0.033, x: 0.27, y: 0.12, z: 0.04 },
  { size: 0.033, x: 0.225, y: 0.15, z: 0.04 },
  { size: 0.033, x: 0.17, y: 0.15, z: 0.04 },
  { size: 0.033, x: 0.113, y: 0.14, z: 0.04 },
  { size: 0.033, x: 0.065, y: 0.1, z: 0.04 },
  { size: 0.033, x: 0.01, y: 0.07, z: 0.04 },
  { size: 0.033, x: -0.04, y: 0.05, z: 0.04 },
  { size: 0.033, x: -0.095, y: 0.03, z: 0.04 },
  { size: 0.033, x: -0.14, y: 0.009, z: 0.04 }, // pai nosso
  { size: 0.033, x: -0.192, y: 0.009, z: 0.04 },
  { size: 0.033, x: -0.25, y: 0.009, z: 0.04 },
  { size: 0.033, x: -0.305, y: 0.015, z: 0.04 },
  { size: 0.033, x: -0.364, y: 0.0265, z: 0.04 },
  { size: 0.033, x: -0.415, y: 0.06, z: 0.04 },
  { size: 0.033, x: -0.445, y: 0.107, z: 0.04 },
  { size: 0.033, x: -0.447, y: 0.167, z: 0.04 },
  { size: 0.033, x: -0.445, y: 0.225, z: 0.04 },
  { size: 0.033, x: -0.43, y: 0.28, z: 0.04 },
  { size: 0.033, x: -0.4, y: 0.33, z: 0.04 },
  { size: 0.033, x: -0.36, y: 0.38, z: 0.04 }, // pai nosso
  { size: 0.033, x: -0.311, y: 0.42, z: 0.04 },
  { size: 0.033, x: -0.255, y: 0.44, z: 0.04 },
  { size: 0.033, x: -0.202, y: 0.45, z: 0.04 },
  { size: 0.033, x: -0.145, y: 0.465, z: 0.04 },
  { size: 0.033, x: -0.09, y: 0.485, z: 0.04 },
  { size: 0.033, x: -0.027, y: 0.485, z: 0.04 },
  { size: 0.033, x: 0.03, y: 0.48, z: 0.04 },
  { size: 0.033, x: 0.085, y: 0.46, z: 0.04 },
  { size: 0.033, x: 0.145, y: 0.45, z: 0.04 },
  { size: 0.033, x: 0.2, y: 0.44, z: 0.04 },
  { size: 0.033, x: 0.265, y: 0.44, z: 0.04 }, // pai nosso
  { size: 0.033, x: 0.325, y: 0.4395, z: 0.04 },
  { size: 0.033, x: 0.37, y: 0.41, z: 0.04 },
  { size: 0.033, x: 0.33, y: 0.365, z: 0.04 },
  { size: 0.033, x: 0.275, y: 0.35, z: 0.04 },
  { size: 0.033, x: 0.22, y: 0.35, z: 0.04 },
  { size: 0.033, x: 0.16, y: 0.33, z: 0.04 },
  { size: 0.033, x: 0.105, y: 0.305, z: 0.04 },
  { size: 0.033, x: 0.05, y: 0.293, z: 0.04 },
  { size: 0.033, x: 0.01, y: 0.25, z: 0.04 },
  { size: 0.033, x: 0.01, y: 0.2, z: 0.04 },
  { size: 0.033, x: 0.065, y: 0.2, z: 0.04 }, // pai nosso
  { size: 0.033, x: 0.115, y: 0.215, z: 0.04 },
  { size: 0.033, x: 0.17, y: 0.24, z: 0.04 },
  { size: 0.033, x: 0.225, y: 0.26, z: 0.04 },
  { size: 0.033, x: 0.28, y: 0.248, z: 0.04 },
  { size: 0.033, x: 0.34, y: 0.23, z: 0.04 },
  { size: 0.033, x: 0.388, y: 0.198, z: 0.04 },
  { size: 0.033, x: 0.43, y: 0.16, z: 0.04 },
  { size: 0.033, x: 0.445, y: 0.105, z: 0.04 },
  { size: 0.033, x: 0.445, y: 0.105, z: 0.04 },
  { size: 0.033, x: 0.445, y: 0.05, z: 0.04 },
  { size: 0.033, x: 0.42, y: 0, z: 0.04 },
];

nodesPos.map(({ size, x, y, z }, i) =>
  rosarium.three.createNode(size, (sphere) => {
    sphere.position.set(x, y, z);
    sphere.name = "node_" + i;
  })
);

rosarium.three.render();

function animate() {
  rosarium.three.animate();
  requestAnimationFrame(animate);
}
animate();

window.addEventListener(
  "resize",
  () => {
    rosarium.three.camera.aspect = window.innerWidth / window.innerHeight;
    rosarium.three.camera.updateProjectionMatrix();
    rosarium.three.renderer.setSize(window.innerWidth, window.innerHeight);
    rosarium.three.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  },
  false
);

rosarium.three.labelRenderer.domElement.addEventListener(
  "click",
  (event) => {
    rosarium.three.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    rosarium.three.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    rosarium.three.raycaster.setFromCamera(
      rosarium.three.mouse,
      rosarium.three.camera
    );

    const intersects = rosarium.three.raycaster.intersectObject(
      rosarium.three.scene,
      true
    );

    if (intersects.length > 0) {
      const object = intersects[0].object;
      if (object.name.includes("node")) {
        rosarium.selectNode(Number(object.name.split("_")[1]));
        rosarium.resetProgressBar();
      }
    }

    rosarium.three.render();
  },
  false
);

const leftbar = document.getElementById("leftbar");
let config_clicked = false;
document.getElementById("config").addEventListener("click", () => {
  if (config_clicked) {
    leftbar.style.display = "none";
  } else {
    leftbar.style.display = "initial";
  }
  config_clicked = !config_clicked;
});

document.getElementById("cancel").addEventListener("click", () => {
  leftbar.style.display = "none";
  config_clicked = false;
});

document.getElementById("reload-btn").addEventListener("click", (e) => {
  location.reload();
});

document.getElementById("pause-btn").addEventListener("click", (e) => {
  if (rosarium.paused) {
    rosarium.play();
  } else {
    rosarium.pause();
  }
});

document.getElementById("left-btn").addEventListener("click", () => {
  let i = rosarium.currentNodeIndex - 1;
  if (i < 0) i = nodesPos.length - 1;
  rosarium.selectNode(i);
  rosarium.resetProgressBar();
});

document.getElementById("right-btn").addEventListener("click", () => {
  let i = rosarium.currentNodeIndex + 1;
  if (i > nodesPos.length - 1) i = 5;
  rosarium.selectNode(i);
  rosarium.resetProgressBar();
});

document.getElementById("day").innerText = rosarium.currDay;

document.getElementById("mysterium").innerHTML = rosarium.currMysterium
  .map((e) => "<li>" + e + "</li>")
  .join("");

const place_hidden_select = document.getElementById("place-hidden-select");

Places.map((place, i) => {
  const option = document.createElement("option");
  option.value = place.id;
  place_hidden_select.appendChild(option);
});
