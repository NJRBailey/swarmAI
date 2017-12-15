import {Actor} from './actor.js';
import TinyQueue from 'tinyqueue';

/**
 * A simulation of cooperative (Swarm) AI.
 * 
 * In this version, the following rules apply:
 * - Resources are infinite
 * - An Actor will never be completely surrounded
 * - An Actor can carry one item at a time
 * 
 * @version Basic
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
    window.sim = this;

    window.testQueue = new TinyQueue([], function(a, b) {
      return (
        (Math.abs(1 - a[0]) + Math.abs(1 - a[1]))
        - (Math.abs(1 - b[0]) + Math.abs(1 - b[1]))
      );
    });

    this.config = simulationConfig;

    this.area = this.config.simulationArea;

    // Store the actors
    this.actors = [];
    // Stores the current paths for each actor
    this.paths = {};
    // Stores the objective locations so we can tell when they have been built
    this.objectiveSpaces = [];
    for (let objective of this.config.objectiveElements) {
      this.objectiveSpaces = this.objectiveSpaces.concat(this._findPosition(objective));
      console.log(this.objectiveSpaces);
    }

    // Stores the objective locations as an object to prevent removal race conditions
    this.objectives = {};
    for (let position of this.objectiveSpaces) {
      this.objectives[position] = this.getElement(position);
    }
    // Store the locations of all item dispensers
    this.itemSpaces = [];
    for (let item of this.config.itemElements) {
      this.itemSpaces = this.itemSpaces.concat(this._findPosition(item));
    }

    // Create the Actors
    let actorPositions = this._findPosition('A');
    for (let i = 0; i < this.config.actorCount; i++) {
      let actorDetails = this.config.actorDetails[i];
      let startingPosition = actorPositions[i];
      // Take a deep copy of the objective spaces
      let objectiveSpaces = Array.from(this.objectiveSpaces);
      // Compile the rules the Actor will need
      let actorConfig = {
        identifier: actorDetails.identifier,
        priority: actorDetails.priority,
        startingPosition: startingPosition,
        items: this.config.itemElements,
        ground: this.config.groundElements,
        objectives: this.config.objectiveElements,
        objectiveSpaces: objectiveSpaces,
        heuristic: this.config.pathfindingHeuristic,
      };
      let actor = new Actor(actorConfig, this);
      // Creates an entry in the actors and paths Objects with identifier as the key
      this.actors.push = actor;
      this.paths[actorDetails.identifier] = [];
    }
  }

  /**
   * Finds the position of all occurrences of the element
   * @param {String} element The element we will search for
   * @return {Array}         The coordinates of each element
   */
  _findPosition(element) {
    let simulationArea = this.area;
    let positions = [];
    for (let row = 0; row < simulationArea.length; row++) {
      for (let column = 0; column < simulationArea[row].length; column++) {
        if (simulationArea[row][column] === element) {
          positions.push([row,column]);
        }
      }
    }
    return positions;
  }

  /**
   * Returns the element at the specified position
   * @param {Array} position The position to check in the form [row, column]
   */
  getElement(position) {
    return this.area[position[0]][position[1]]
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
    this.area[position[0]][position[1]] = newElement;
    this.print();
  }

  /**
   * Calculates the tile distance between the two positions
   * @param  {Array}   firstPosition  The first position
   * @param  {Array}   secondPosition The second position
   * @return {Integer}                The tile distance (i.e. not straight-line)
   */
  findDistance(firstPosition, secondPosition) {
    let distance;

    return distance;
  }

  /**
   * Interrupts the interval for an Actor when another Actor has forced priority
   * @param {String} actorId The ID for the Actor being interrupted
   */
  interruptInterval(actorId) {
    for (let actor of this.actors) {
      if (actor.identifier === actorId) {
        clearInterval(actor.interval);
        actor.activate(actor.time);
      }
    }
  }

  /**
   * Prints the simulation map (for a terminal game)
   */
  print() {
    let simulationArea = this.area;
    for (let row of simulationArea) {
      console.log(row);
    }
    console.log('');
    console.log('---------------------------------------------------');
    console.log('');
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