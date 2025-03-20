export const Places = [
  {
    id: "church_of_st_peter_stourton",
    title: "St Peter's, United Kingdom.",
    models: ["4k.glb", "8k.glb","1k.glb"],
    callback: (model) => {
      model.position.set(-20, -25, 0);
      model.scale.set(10, 10, 10);
    }
  },
  {
    id: "Calatrava_la_Nueva_Spain",
    title: "Calatrava la Nueva, Spain.",
    models: ["1k.glb"],
    callback: (model) => {
      model.position.set(10, -90, 100);
      model.scale.set(10, 10, 10);
    }
  },
  {
    id: "Sacrification_Church_of_Pyhamaa",
    title: "Sacrification Pyhämaa, Finland.",
    models: ["1k.glb"],
    callback: (model) => {
      model.position.set(2, -30, 50);
      model.scale.set(10, 10, 10);
    }
  },
];
export const Rosaries = [
  {
    id: "rosary_default",
    title: "Wood default",
    models: ["default.glb", "4k.glb"],
  },
];
