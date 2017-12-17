export class terminalGui {

  /**
   * Loads the output textarea onto the page
   */
  constructor(rows, columns) {
    let outputArea = document.getElementById('simulation');
    this.output = document.createElement('textarea');
    this.output.style.fontSize = '20px';
    this.output.style.overflow = 'visible';
    this.output.rows = rows*2;
    this.output.cols = columns*2;
    outputArea.appendChild(this.output);
  }

  /**
   * Clears the current display and displays the new area
   * @param {Array} area The simulation area - will only work for 2D maps
   */
  updateGui(area) {
    this.output.value = '';
    let display = '';
    for (let row of area) {
      display = display.concat(row.toString().replace(/,/g,' ') + '\n');
    }
    this.output.value = display;
  }
}