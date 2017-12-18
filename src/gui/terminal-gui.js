export class terminalGui {
  /**
   * Loads the output textarea onto the page
   */
  constructor(rows, columns, simulation) {
    this.simulation = simulation;
    let outputArea = document.getElementById("simulation");
    let controls = document.createElement('div');
    let display = document.createElement('div');
    outputArea.appendChild(controls);
    outputArea.appendChild(display);

    this.tickTimeInput = document.createElement("textarea");
    this.tickTimeInput.style.resize = "none";
    this.tickTimeInput.value = 1000;
    controls.appendChild(this.tickTimeInput);

    this.activate = document.createElement("button");
    this.activate.innerHTML = 'Activate simulation'
    this.activate.addEventListener('click', () => {
       this.simulation.activateAll(this.tickTimeInput.value);
    });
    controls.appendChild(this.activate);

    this.output = document.createElement("textarea");
    this.output.style.fontSize = "20px";
    this.output.style.overflow = "visible";
    this.output.rows = rows + 1;
    this.output.cols = columns * 2;
    this.output.style.resize = 'none';
    this.output.disabled = true;
    display.appendChild(this.output);
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
