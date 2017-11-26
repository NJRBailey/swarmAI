(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * A basic Actor for the Simulation.
 * @version 2017-11-22
 * @author NJRBailey
 *
 * Actors want to pick up blocks, place the block, and repeat until done, without:
 *  - Colliding with another Actor or block
 *  - Making the same section as another Actor
 *  - Barring off a section from being made (e.g. by surrounding an empty objective point with blocks) 
 *
 * One way would be to have the bots constantly trading locations
 * I think a better way would be to use a path-finding algorithm (e.g. A*) to determine a path for each Actor to the next objective,
 * which is shared out to the other Actors, and update it if three conditions are met:
 *  1) The paths cross the same point for multiple Actors
 *  2) The paths will cross after the same number of moves (tiles traversed)
 *  3) The priority for this Actor is less than for the other Actor
 * This point will then need to be temporarily blacklisted for that actor, until the next objective is completed
 * For this version of the Actor there are no chokepoints, so the Actors can be constantly moving.
 * Performing an action, like picking up or placing an item, takes one move.
 */
var Actor = exports.Actor = function () {
  /**
   * Create a new basic Actor
   * @param {String}     identifier The unique identifier for this Actor
   * @param {Integer}    priority   The priority to use in path disputes - lower value means higher importance
   * @param {Array}      position   The coordinates of the starting position
   * @param {Simulation} simulation The Simulation to broadcast position, route, objective point to
   */
  function Actor(identifier, priority, position, simulation) {
    _classCallCheck(this, Actor);

    this.identifier = identifier;
    this.priority = priority;
    this.simulation = simulation;
    // Whether the Actor should be performing tasks
    this.active = true;
    // Whether the Actor is carrying an item
    this._item = undefined;
    // The position of the Actor
    this.position = position;

    // for testing
    window.actors.push(this);
    console.log('you got it');
  }

  /**
   * Returns the elements at the edge of the Actor.
   * @return {Array} The elements at each edge.
   */


  _createClass(Actor, [{
    key: '_getSurroundings',
    value: function _getSurroundings() {
      // FIXME will probably crash if we check invalid indices (e.g. [-1])
      // TODO the x and y may be the wrong way round
      var actorX = this.position[0];
      var actorY = this.position[1];
      // The elements on each of the four edges
      var edges = [this.simulation.area[actorX][actorY - 1], // North
      this.simulation.area[actorX + 1][actorY], // East
      this.simulation.area[actorX][actorY + 1], // South
      this.simulation.area[actorX - 1][actorY]];
      return edges;
    }
  }]);

  return Actor;
}();

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Simulation = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _actor = require('./actor.js');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * A simulation of cooperative (Swarm) AI.
 * @version 2017-11-21
 * @author NJRBailey
 */
var Simulation = exports.Simulation = function () {
  /**
   * Defines the simulation area, objective and actors.
   * @param {Object} simulationConfig General setup options.
   */
  function Simulation(simulationConfig) {
    _classCallCheck(this, Simulation);

    alert('hello');
    // for testing
    window.actors = [];
    this.config = simulationConfig;

    this.area = this.config.simulationArea;

    // Store the actors
    this.actors = {};
    // Stores the current paths for each actor
    this.paths = {};
    // Create the Actors
    for (i = 0; i < this.config.actorCount; i++) {
      var actorDetails = this.config.actorDetails[i];
      var startingPosition = this._findPosition('A')[i];
      var actor = new _actor.Actor(actorDetails.identifier, actorDetails.priority, startingPosition, this);
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


  _createClass(Simulation, [{
    key: '_findPosition',
    value: function _findPosition(element) {
      var positions = [];
      for (var row = 0; row < simulationArea.length; row++) {
        for (var item = 0; item < simulationArea[row].length; item++) {
          // TODO The x and y might be the wrong way round
          if (simulationArea[row][item] === element) {
            positions.push([row, item]);
          }
        }
      }
      return positions;
    }
  }]);

  return Simulation;
}();

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

},{"./actor.js":1}]},{},[2]);
