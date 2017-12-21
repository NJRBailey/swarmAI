export class terminalGui {
  /**
   * Loads the output textarea onto the page
   */
  constructor(rows, columns, simulation) {
    this.simulation = simulation;
    let outputArea = document.getElementById("simulation");
    let controls = document.createElement("div");
    let display = document.createElement("div");
    let keyArea = document.createElement("div");

    outputArea.appendChild(controls);
    outputArea.appendChild(display);
    outputArea.appendChild(keyArea);

    this.tickTimeLabel = document.createElement("label");
    this.tickTimeLabel.innerHTML = "Tick time: ";
    controls.appendChild(this.tickTimeLabel);

    this.tickTimeInput = document.createElement("textarea");
    this.tickTimeInput.style.resize = "none";
    this.tickTimeInput.value = 500;
    this.tickTimeInput.rows = 1;
    this.tickTimeInput.cols = 5;
    controls.appendChild(this.tickTimeInput);

    this.activate = document.createElement("button");
    this.activate.innerHTML = "Activate simulation";
    this.activate.addEventListener("click", () => {
      this.simulation.activateAll(this.tickTimeInput.value);
    });
    controls.appendChild(this.activate);

    this.output = document.createElement("textarea");
    this.output.style.fontSize = "30px";
    this.output.style.overflow = "visible";
    this.output.rows = rows + 1;
    this.output.cols = columns * 2;
    this.output.style.resize = "none";
    display.appendChild(this.output);

    this.key = document.createElement("p");
    this.key.innerHTML =
      "Key:<br>Ground Tiles: " +
      this.simulation.config.groundElements +
      "<br> Bots: A<br> Dispensers: " +
      this.simulation.config.itemElements +
      "<br> Objective Zones: " +
      this.simulation.config.objectiveElements;
    keyArea.appendChild(this.key);
  }

  /**
   * Clears the current display and displays the new area
   * @param {Array} area The simulation area - will only work for 2D maps
   */
  updateGui(area) {
    this.output.value = "";
    let display = "";
    for (let row of area) {
      display = display.concat(row.toString().replace(/,/g, " ") + "\n");
    }
    this.output.value = display;
  }
}
