(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * A basic Actor for the Simulation.
 * @version Basic
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
   * @param {Object}     config      The config settings for Actors
   * @param {String}     identifier The unique identifier for this Actor
   * @param {Integer}    priority   The priority to use in path disputes - lower value means higher importance
   * @param {Array}      position   The coordinates of the starting position
   * @param {Simulation} simulation The Simulation to broadcast position, route, objective point to
   */
  function Actor(config, simulation) {
    _classCallCheck(this, Actor);

    this.config = config;
    this.identifier = config.identifier;
    this.priority = config.priority;
    this.simulation = simulation;
    // Whether the Actor should be performing tasks
    this.active = true;
    // Whether the Actor is carrying an item
    this._item = undefined;
    // The position of the Actor
    this.position = config.startingPosition;

    // for testing
    window.actors.push(this);
  }

  /**
   * Returns the elements at the edge of the Actor.
   * @return {Array} The elements at each edge.
   */


  _createClass(Actor, [{
    key: '_getSurroundings',
    value: function _getSurroundings() {
      // FIXME will probably crash if we check invalid indices (e.g. [-1])
      var actorRow = this.position[0];
      var actorColumn = this.position[1];
      // The elements on each of the four edges
      var edges = [this.simulation.area[actorRow - 1][actorColumn], // North
      this.simulation.area[actorRow][actorColumn + 1], // East
      this.simulation.area[actorRow + 1][actorColumn], // South
      this.simulation.area[actorRow][actorColumn - 1]];
      return edges;
    }

    /**
     * Returns the current row and column of this Actor
     * @return {Array} The actor's row and column
     */

  }, {
    key: 'getPosition',
    value: function getPosition() {
      return this.position;
    }

    /**
     * Moves one position in the specified direction, if allowed.
     * @param {String} direction The direction to move in | N,E,S,W
     */

  }, {
    key: 'move',
    value: function move(direction) {
      var edges = this._getSurroundings();
      switch (direction) {
        case 'N':
          if (this.config.ground.includes(edges[0])) {
            var north = [this.position[0] - 1, this.position[1]];
            this.simulation.swapElements(this.position, north);
            this.position = north;
          } else {
            throw new Error('Tried to move into a: ' + edges[0]);
          }
          break;
        case 'E':
          if (this.config.ground.includes(edges[1])) {
            var east = [this.position[0], this.position[1] + 1];
            this.simulation.swapElements(this.position, east);
            this.position = east;
          } else {
            throw new Error('Tried to move into a: ' + edges[1]);
          }
          break;
        case 'S':
          if (this.config.ground.includes(edges[2])) {
            var south = [this.position[0] + 1, this.position[1]];
            this.simulation.swapElements(this.position, south);
            this.position = south;
          } else {
            throw new Error('Tried to move into a: ' + edges[2]);
          }
          break;
        case 'W':
          if (this.config.ground.includes(edges[3])) {
            var west = [this.position[0], this.position[1] - 1];
            this.simulation.swapElements(this.position, west);
            this.position = west;
          } else {
            throw new Error('Tried to move into a: ' + edges[3]);
          }
          break;
      }
    }

    /**
     * Picks up the specified item if it is next to one
     * @param {String} item An item element
     */

  }, {
    key: 'takeItem',
    value: function takeItem(item) {
      if (this.config.items.includes(item)) {
        var edges = this._getSurroundings();
        if (edges.includes(item)) {
          // Lower case indicates an item, rather than a spawner
          this.item = item.toLowerCase();
        } else {
          throw new Error(this.identifier + ' tried to take an item: ' + item + ' that it was not next to');
        }
      } else {
        throw new Error(this.identifier + 'tried to take an unspecified item: ' + item);
      }
    }

    /**
     * Places the currently held item in the position
     * @param {Array} position The position to place the item in
     */

  }, {
    key: 'placeItem',
    value: function placeItem(position) {
      if (this.item !== undefined) {
        this.simulation.replaceElement(position, this.item);
        this.item = undefined;
      } else {
        throw new Error(this.identifier + ' tried to place an item while it was not holding one');
      }
    }

    // Calculate where to place algorithm
    // case for each direction
    // this.placeItem([
    //   this.getPosition()[0] + x,
    //   this.getPosition()[1] + y,
    // ])

  }]);

  return Actor;
}();

},{}],2:[function(require,module,exports){
'use strict';

var _simulation = require('./simulation.js');

var rules = {
  // The number of actors (bots)
  actorCount: 2,
  // The details for those actors
  actorDetails: [{
    identifier: 'boss',
    priority: 0
  }, {
    identifier: 'newkid',
    priority: 1
  }],
  // The elements Actors are allowed to move onto
  groundElements: ['_'],
  // The elements Actors can pick up
  itemElements: ['B'],
  // The elements Actors try to build
  objectiveElements: ['O'],
  // The area in which the simulation will take place - / = Solid, _ = Ground, Actor spawn, Material spawn, Objective
  simulationArea: [['/', '/', '/', '/', '/', '/', '/', '/'], ['/', 'A', '_', '_', '_', '_', '_', '/'], ['/', 'A', '_', '_', 'O', 'O', '_', '/'], ['/', '_', '_', '_', 'O', 'O', '_', '/'], ['/', 'B', '_', '_', '_', '_', '_', '/'], ['/', '/', '/', '/', '/', '/', '/', '/']]
};

var simulation = new _simulation.Simulation(rules);

},{"./simulation.js":3}],3:[function(require,module,exports){
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
 * 
 * In this version, the following rules apply:
 * - Resources are infinite
 * - An Actor will never be completely surrounded
 * - An Actor can carry one item at a time
 * 
 * @version 1.0 Basic
 * @author NJRBailey
 */
var Simulation = exports.Simulation = function () {
  /**
   * Defines the simulation area, objective and actors.
   * @param {Object} simulationConfig General setup options.
   */
  function Simulation(simulationConfig) {
    _classCallCheck(this, Simulation);

    // for testing
    window.actors = [];
    window.sim = this;

    this.config = simulationConfig;

    this.area = this.config.simulationArea;

    // Store the actors
    this.actors = {};
    // Stores the current paths for each actor
    this.paths = {};
    // Create the Actors
    var actorPositions = this._findPosition('A');
    for (var i = 0; i < this.config.actorCount; i++) {
      var actorDetails = this.config.actorDetails[i];
      var startingPosition = actorPositions[i];
      // Compile the rules the Actor will need
      var actorConfig = {
        identifier: actorDetails.identifier,
        priority: actorDetails.priority,
        startingPosition: startingPosition,
        items: this.config.itemElements,
        ground: this.config.groundElements,
        objectives: this.config.objectiveElements
      };
      var actor = new _actor.Actor(actorConfig, this);
      // Creates an entry in the actors and paths Objects with identifier as the key
      this.actors[actorDetails.identifier] = actor;
      this.paths[actorDetails.identifier] = [];
    }

    // Stores the objective locations so we can tell when they have been built
    var objectiveSpaces = this._findPosition('O');

    // while (objectiveSpaces.length...) {
    //
    //}
  }

  /**
   * Finds the position of all occurrences of the element
   * @param {String} element The element we will search for
   * @return {Array}         The coordinates of each element
   */


  _createClass(Simulation, [{
    key: '_findPosition',
    value: function _findPosition(element) {
      var simulationArea = this.area;
      var positions = [];
      for (var row = 0; row < simulationArea.length; row++) {
        for (var column = 0; column < simulationArea[row].length; column++) {
          if (simulationArea[row][column] === element) {
            positions.push([row, column]);
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

  }, {
    key: 'swapElements',
    value: function swapElements(firstPosition, secondPosition) {
      var f = firstPosition;
      var s = secondPosition;
      var firstElement = this.area[f[0]][f[1]];
      var secondElement = this.area[s[0]][s[1]];
      this.area[f[0]][f[1]] = secondElement;
      this.area[s[0]][s[1]] = firstElement;
    }

    /**
     * Replaces the element currently in the position with the new element
     * @param {Array}  position   The position to replace an element at
     * @param {String} newElement The element to replace with
     */

  }, {
    key: 'replaceElement',
    value: function replaceElement(position, newElement) {
      this.area[position[0]][position[1]] = newElement;
    }

    /**
     * Prints the simulation map (for a terminal game)
     */

  }, {
    key: 'print',
    value: function print() {
      var simulationArea = this.area;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = simulationArea[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var row = _step.value;

          console.log(row);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
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
