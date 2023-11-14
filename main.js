import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/addons/renderers/CSS2DRenderer.js";

class Three {
  scene;
  camera;
  renderer;
  controls;
  raycaster;
  mouse;
  labelRenderer;
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
      path: "models/church_of_st_peter_stourton",
    },
    rosary: {
      path: "models/rosary",
    },
  };
}

class Rosarium {
  three;
  resources;
  static mode = "";
  static isDevMode = this.mode === "dev";
  constructor() {
    this.three = new Three();
    this.resources = new Resources();
  }
}

const rosarium = new Rosarium();

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
  { size: 0.033, x: 0.33, y: -0.09, z: 0.04 },
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
  { size: 0.033, x: -0.35, y: 0.395, z: 0.04 },
  { size: 0.033, x: -0.305, y: 0.42, z: 0.04 },
  { size: 0.033, x: -0.255, y: 0.44, z: 0.04 },
  { size: 0.033, x: -0.202, y: 0.45, z: 0.04 },
  { size: 0.033, x: -0.145, y: 0.465, z: 0.04 },
  { size: 0.033, x: -0.09, y: 0.485, z: 0.04 },
  { size: 0.033, x: -0.027, y: 0.485, z: 0.04 },
  { size: 0.033, x: 0.03, y: 0.48, z: 0.04 },
  { size: 0.033, x: 0.085, y: 0.46, z: 0.04 },
  { size: 0.033, x: 0.145, y: 0.45, z: 0.04 },
  { size: 0.033, x: 0.2, y: 0.44, z: 0.04 },
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

function getLabel(i) {
  switch (i) {
    case 0:
      return "Credo";
    case 5:
    case 1:
      return "Pater Noster";
    default:
      return "Ave Maria";
  }
}
function getOrandi(i) {
  switch (i) {
    case 0:
      return "Credo in Deum Patrem omnipotentem, Creatorem cæli et terræ. Et in Iesum Christum, Filium eius unicum, Dominum nostrum, qui conceptus est de Spiritu Sancto, natus ex Maria Virgine, passus sub Pontio Pilato, crucifixus, mortuus, et sepultus, descendit ad inferos, tertia die resurrexit a mortuis, ascendit ad cælos, sedet ad dexteram Dei Patris omnipotentis, inde venturus est iudicare vivos et mortuos. Credo in Spiritum Sanctum, sanctam Ecclesiam catholicam, sanctorum communionem, remissionem peccatorum, carnis resurrectionem, vitam æternam. Amen.";
    case 5:
    case 1:
      return "Pater Noster, qui es in cælis, sanctificetur nomen tuum. Adveniat regnum tuum. Fiat voluntas tua, sicut in cælo et in terra. Panem nostrum quotidianum da nobis hodie, et dimitte nobis debita nostra sicut et nos dimittimus debitoribus nostris. Et ne nos inducas in tentationem, sed libera nos a malo. Amen.";
    default:
      return "Ave Maria, gratia plena, Dominus tecum. Benedicta tu in mulieribus, et benedictus fructus ventris tui, Iesus. Sancta Maria, Mater Dei, ora pro nobis peccatoribus, nunc, et in hora mortis nostræ. Amen.";
  }
}

const orandi = document.getElementById('orandi')
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
        object.material.color.set(0x0000ff);

        const i = Number(object.name.split("_")[1]);
        orandi.innerText = getOrandi(i)

        const cubeDiv = document.createElement("div");
        cubeDiv.className = "label";
        cubeDiv.textContent = getLabel(i);

        const cubeLabel = new CSS2DObject(cubeDiv);

        object.add(cubeLabel);
        rosarium.three.labelRenderer.render(
          rosarium.three.scene,
          rosarium.three.camera
        );
      }
    }

    rosarium.three.render();
  },
  false
);
