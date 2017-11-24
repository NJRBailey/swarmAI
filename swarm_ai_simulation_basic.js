/**
 * A simulation of cooperative (Swarm) AI.
 * @version 2017-11-21
 * @author NJRBailey
 */
class Simulation {
  /**
   * Defines the simulation area, objective and actors.
   * @param {Object} simulationConfig General setup options.
   */
  constructor(simulationConfig) {
    this.config = simulationConfig;

    // 
    for (i = 0; i < this.config.actorCount; i++) {

    }
  }
}

// draw() {
  //     let canvas = document.getElementById('simulation-canvas');
  //     let cx = canvas.getContext('2d');
  
  //     cx.beginPath();
  
  //     let simulationArea = this.rules.simulationArea;
  //     console.log(simulationArea);
  
  //     for (let row = 0; row < simulationArea.length; row++) {
  //       for (let item = 0; item < simulationArea[row].length; item++) {
  //         if (simulationArea[row][item] === '/') {
  //           // Will only work as long as simulationArea is 8x6 and canvas is 800x600
  //           cx.rect(100 * item, 100 * row, 100, 100);
  //         }
  //       }
  //     }
  
  //     cx.fillStyle = 'black';
  //     cx.fill();
  //     cx.closePath();
  
  //     cx.beginPath();
  //     // Drawing a diamond
  //     cx.moveTo(150, 100);
  //     // Line down right
  //     cx.lineTo(200, 150);
  //     // Line down left
  //     cx.lineTo(150, 200);
  //     // Line up left
  //     cx.lineTo(100, 150);    
  //     cx.fillStyle = '#777777';
  //     cx.fill();
  //     cx.closePath();
  //   }
  // }