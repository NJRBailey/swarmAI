import {Actor} from './actor.js';

/**
 * A simulation of cooperative (Swarm) AI.
 * 
 * In this version, the following rules apply:
 * - Resources are infinite
 * - An Actor will never be completely surrounded
 * - An Actor can carry one item at a time
 * 
 * @version 1.0 Basic
 * @author NJRBailey
 */
export class Simulation {
  /**
   * Defines the simulation area, objective and actors.
   * @param {Object} simulationConfig General setup options.
   */
  constructor(simulationConfig) {
    // for testing
    window.actors = [];

    this.config = simulationConfig;

    this.area = this.config.simulationArea;

    // Store the actors
    this.actors = {};
    // Stores the current paths for each actor
    this.paths = {};
    // Create the Actors
    let actorPositions = this._findPosition('A');
    for (let i = 0; i < this.config.actorCount; i++) {
      let actorDetails = this.config.actorDetails[i];
      let startingPosition = actorPositions[i];
      let actor = new Actor(actorDetails.identifier, actorDetails.priority, startingPosition, this);
      // Creates an entry in the actors and paths Objects with identifier as the key
      this.actors[actorDetails.identifier] = actor;
      this.paths[actorDetails.identifier] = [];
    }
  }

  /**
   * Finds the position of all occurrences of the element
   * @param {String} element The element we will search for
   * @return {Array}         The coordinates of each element
   */
  _findPosition(element) {
    let simulationArea = this.config.simulationArea;
    let positions = [];
    for (let row = 0; row < simulationArea.length; row++) {
      for (let column = 0; column < simulationArea[row].length; column++) {
        // TODO The x and y might be the wrong way round
        if (simulationArea[row][column] === element) {
          positions.push([row,column]);
        }
      }
    }
    console.log(positions);
    return positions;
  }

  /**
   * Switches the elements in the specified positions
   * @param {Array} firstPosition  The first position to swap
   * @param {Array} secondPosition The second position to swap
   */
  swapElements(firstPosition, secondPosition) {
    let f = firstPosition;
    let s = secondPosition;
    let firstElement = this.area[f[0]][f[1]];
    let secondElement = this.area[s[0]][s[1]];
    this.area[f[0]][f[1]] = secondElement;
    this.area[s[0]][s[1]] = firstElement;
  }

  /**
   * Replaces the element currently in the position with the new element
   * @param {Array}  position   The position to replace an element at
   * @param {String} newElement The element to replace with
   */
  replaceElement(position, newElement) {
    this.area[position[0], position[1]] = newElement;
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