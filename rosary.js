import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/addons/renderers/CSS2DRenderer.js";
import { places } from "./places.js";

THREE.DefaultLoadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
  document.body.insertAdjacentHTML(
    "beforebegin",
    '<p id="loading-text" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">Loading...<p>'
  );
};

THREE.DefaultLoadingManager.onLoad = function () {
  const e = document.getElementById("loading-text");
  e.parentNode.removeChild(e);
  rosarium.start_progress_bar();
};

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

class Config {
  beadTime;
  fontSize;
  jaculatorium;
  uiLanguage;
  constructor() {
    if (urlParams.get("auto-bead")) {
      this.beadTime = Number(urlParams.get("bead-time").replace(/[^0-9]/g, ""));
    } else {
      document.getElementById("pause-btn").style.display = "none";
    }
    const jaculatorium = urlParams.get("jaculatorium");
    if (jaculatorium?.length) {
      this.jaculatorium =
        jaculatorium.split(",").join(" ora pro nobis, ") + " ora pro nobis.";
    }
    this.uiLanguage = urlParams.get("ui-language");
    this.fontSize = urlParams.get("font-size");
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
    if (Rosarium.isDevMode) {
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

    this.raycaster = new THREE.Raycaster();

    this.mouse = new THREE.Vector2();

    this.rosaryNodes = [];
  }
  createLight(color, intensity, callback) {
    const light = new THREE.DirectionalLight(color, intensity);
    callback && callback(light);
    this.scene.add(light);
    if (Rosarium.isDevMode) {
      const helper = new THREE.DirectionalLightHelper(light, 5);
      this.scene.add(helper);
    }
  }
  createNode(size, callback) {
    const geometry = new THREE.SphereGeometry(size, 32, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: Rosarium.isDevMode ? 0.5 : 0,
    });
    const sphere = new THREE.Mesh(geometry, material);
    callback && callback(sphere);
    // sphere.name = "hitbox";
    this.scene.add(sphere);
    this.rosaryNodes.push(sphere);
  }
  loadGLTFModel(model, callback) {
    var self = this;
    new GLTFLoader().load(model.path + "/scene.gltf", async function (gltf) {
      const _model = gltf.scene;
      callback && callback(_model);

      await self.renderer.compileAsync(_model, self.camera, self.scene);

      self.scene.add(_model);
    });
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

class Resources {
  models = {
    church_of_st_peter_stourton: {
      path: "assets/models/church_of_st_peter_stourton",
    },
    rosary: {
      path: "assets/models/rosary",
    },
  };
}

class Rosarium {
  three;
  resources;
  config;
  elements;

  skipTo;

  currentNodeIndex = 0;

  paused = false;
  pausedNode = 0;
  pausedPercent = 0;

  adGranaMaioraLabel = 0;
  adGranaMaioraIndex = 0;

  static mode = "";
  static isDevMode = this.mode === "dev";
  constructor() {
    this.three = new Three();
    this.resources = new Resources();
    this.config = new Config();
    this.elements = {
      orandi: document.getElementById("orandi"),
      progressBar: document.getElementById("progress-bar"),
    };
  }
  configure() {
    this.elements.orandi.style.fontSize = this.config.fontSize;
    if (this.config.beadTime) {
      this.elements.progressBar.style.display = "block";
    }
  }
  async start_progress_bar() {
    this.selectNode(0);
    if (this.config.beadTime) {
      const p = await progress_bar_round(0, this.config.beadTime);
      if (p) {
        this.pausedNode = 0;
        return;
      }

      for (let i = 1; i < nodesPos.length - 1; i++) {
        this.selectNode(i);
        const p = await progress_bar_round(0, this.config.beadTime);
        if (p) {
          this.pausedNode = i;
          return;
        }
      }
    }
  }
  async continue_progress_bar() {
    let i = this.pausedNode;
    if (this.skipTo) {
      i = this.skipTo;
      this.skipTo = undefined;
    }
    for (; i < nodesPos.length - 1; i++) {
      this.selectNode(i);
      let p;
      if (i === this.pausedNode) {
        p = await progress_bar_round(
          0,
          this.config.beadTime,
          this.pausedPercent
        );
      } else {
        p = await progress_bar_round(0, this.config.beadTime);
      }

      if (p) {
        this.pausedNode = i;
        return;
      }
    }
  }
  reset_progress_bar() {
    this.skipTo = this.currentNodeIndex;
  }
  selectNode(i) {
    if (this.adGranaMaioraLabel) {
      i = this.adGranaMaioraIndex;
    }

    this.currentNodeIndex = i;

    const object = this.three.rosaryNodes[i];

    const label = this.getLabel(i);
    const cubeDiv = document.createElement("pre");
    cubeDiv.className = "label";
    cubeDiv.textContent = label;

    this.elements.orandi.innerText = this.getPray(label);

    const cubeLabel = new CSS2DObject(cubeDiv);

    object.add(cubeLabel);
    this.three.labelRenderer.render(this.three.scene, this.three.camera);
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
        if (this.adGranaMaioraLabel === 1) {
          return "Oratio Fatima";
        }
        if (this.adGranaMaioraLabel === 2) {
          return "Pater Noster";
        }
        if (this.adGranaMaioraLabel === 3 && this.config.jaculatorium?.length) {
          return "Jaculatorium";
        }
        return "Doxologia Minor";
      case 1:
        return "Pater Noster";
      default:
        return "Ave Maria";
    }
  }
  getPray(label) {
    if (!this.adGranaMaioraLabel && label.includes("Doxologia Minor")) {
      this.adGranaMaioraLabel = 1;
      this.adGranaMaioraIndex = this.currentNodeIndex;
      return "Gloria Patri, et Filio, et Spiritui Sancto. Sicut erat in principio, et nunc, et semper, et in sæcula sæculorum. Amen.";
    } else if (
      this.adGranaMaioraLabel === 1 &&
      label.includes("Oratio Fatima")
    ) {
      this.adGranaMaioraLabel = 2;
      return "O mi Iesu, dimitte nobis debita nostra, libera nos ab igne inferni, conduc in cælum omnes animas, præsertim illas quæ maxime indigent misericordia tua.";
    } else if (
      this.adGranaMaioraLabel === 2 &&
      label.includes("Pater Noster")
    ) {
      if (this.config.jaculatorium?.length) {
        this.adGranaMaioraLabel = 3;
      } else {
        this.adGranaMaioraLabel = 0;
        this.adGranaMaioraIndex = 0;
      }

      return "Pater Noster, qui es in cælis, sanctificetur nomen tuum. Adveniat regnum tuum. Fiat voluntas tua, sicut in cælo et in terra. Panem nostrum quotidianum da nobis hodie, et dimitte nobis debita nostra sicut et nos dimittimus debitoribus nostris. Et ne nos inducas in tentationem, sed libera nos a malo. Amen.";
    } else if (
      this.adGranaMaioraLabel === 3 &&
      this.config.jaculatorium?.length
    ) {
      this.adGranaMaioraLabel = 0;
      this.adGranaMaioraIndex = 0;
      return this.config.jaculatorium;
    }

    switch (label) {
      case "Credo":
        return "Credo in Deum Patrem omnipotentem, Creatorem cæli et terræ. Et in Iesum Christum, Filium eius unicum, Dominum nostrum, qui conceptus est de Spiritu Sancto, natus ex Maria Virgine, passus sub Pontio Pilato, crucifixus, mortuus, et sepultus, descendit ad inferos, tertia die resurrexit a mortuis, ascendit ad cælos, sedet ad dexteram Dei Patris omnipotentis, inde venturus est iudicare vivos et mortuos. Credo in Spiritum Sanctum, sanctam Ecclesiam catholicam, sanctorum communionem, remissionem peccatorum, carnis resurrectionem, vitam æternam. Amen.";
      case "Doxologia Minor\nOratio Fatima\nPater Noster":
      case "Pater Noster":
        return "Pater Noster, qui es in cælis, sanctificetur nomen tuum. Adveniat regnum tuum. Fiat voluntas tua, sicut in cælo et in terra. Panem nostrum quotidianum da nobis hodie, et dimitte nobis debita nostra sicut et nos dimittimus debitoribus nostris. Et ne nos inducas in tentationem, sed libera nos a malo. Amen.";
      default:
        return "Ave Maria, gratia plena, Dominus tecum. Benedicta tu in mulieribus, et benedictus fructus ventris tui, Iesus. Sancta Maria, Mater Dei, ora pro nobis peccatoribus, nunc, et in hora mortis nostræ. Amen.";
    }
  }
}

const rosarium = new Rosarium();
rosarium.configure();

async function progress_bar_round(seconds, max, start_from) {
  let percent;
  if (start_from) {
    percent = start_from;
    seconds = max / (100 / start_from);
  } else {
    percent = (100 / max) * seconds;
  }
  rosarium.elements.progressBar.style.width = percent + "%";
  await new Promise((r) => setTimeout(r, 1000));
  if (percent === 100) {
    return false;
  }
  if (rosarium.paused) {
    rosarium.pausedPercent = percent;
    return true;
  }
  return await progress_bar_round(++seconds, max);
}

rosarium.three.loadGLTFModel(
  rosarium.resources.models.church_of_st_peter_stourton,
  (model) => {
    model.position.set(-20, -25, 0);
    model.scale.set(10, 10, 10);
  }
);

rosarium.three.loadGLTFModel(rosarium.resources.models.rosary, (model) => {
  model.scale.set(10, 10, 10);
  model.rotation.x = Math.PI / 2;
});

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
  // { size: 0.033, x: 0.37, y: -0.03, z: 0.04 }, // salve rainha
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
        rosarium.paused = true;
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

document.getElementById("pause-btn").addEventListener("click", () => {
  const val = !rosarium.paused;
  rosarium.paused = val;
  if (!val) {
    rosarium.continue_progress_bar();
  }
});

document.getElementById("left-btn").addEventListener("click", () => {
  let i = rosarium.currentNodeIndex - 1;
  if (i < 0) i = nodesPos.length - 1;
  rosarium.paused = true;
  rosarium.selectNode(i);
  rosarium.reset_progress_bar();
});

document.getElementById("right-btn").addEventListener("click", () => {
  let i = rosarium.currentNodeIndex + 1;
  if (i > nodesPos.length - 1) i = 0;
  rosarium.paused = true;
  rosarium.selectNode(i);
  rosarium.reset_progress_bar();
});
