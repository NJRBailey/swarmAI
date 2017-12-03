(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = TinyQueue;
module.exports.default = TinyQueue;

function TinyQueue(data, compare) {
    if (!(this instanceof TinyQueue)) return new TinyQueue(data, compare);

    this.data = data || [];
    this.length = this.data.length;
    this.compare = compare || defaultCompare;

    if (this.length > 0) {
        for (var i = (this.length >> 1) - 1; i >= 0; i--) this._down(i);
    }
}

function defaultCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

TinyQueue.prototype = {

    push: function (item) {
        this.data.push(item);
        this.length++;
        this._up(this.length - 1);
    },

    pop: function () {
        if (this.length === 0) return undefined;

        var top = this.data[0];
        this.length--;

        if (this.length > 0) {
            this.data[0] = this.data[this.length];
            this._down(0);
        }
        this.data.pop();

        return top;
    },

    peek: function () {
        return this.data[0];
    },

    _up: function (pos) {
        var data = this.data;
        var compare = this.compare;
        var item = data[pos];

        while (pos > 0) {
            var parent = (pos - 1) >> 1;
            var current = data[parent];
            if (compare(item, current) >= 0) break;
            data[pos] = current;
            pos = parent;
        }

        data[pos] = item;
    },

    _down: function (pos) {
        var data = this.data;
        var compare = this.compare;
        var halfLength = this.length >> 1;
        var item = data[pos];

        while (pos < halfLength) {
            var left = (pos << 1) + 1;
            var right = left + 1;
            var best = data[left];

            if (right < this.length && compare(data[right], best) < 0) {
                left = right;
                best = data[right];
            }
            if (compare(best, item) >= 0) break;

            data[pos] = best;
            pos = left;
        }

        data[pos] = item;
    }
};

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Actor = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _aStarSearch = require('./pathfinding/a-star-search.js');

var _tinyqueue = require('tinyqueue');

var _tinyqueue2 = _interopRequireDefault(_tinyqueue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 *
 * Could store multiple algorithms
 * And optimisations could be things like 'only calculate x moves in front' where x depends
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
    // The current objective position of the Actor
    this.objective = undefined;
    // The current path of the Actor
    this.path = [];
    // Objective priorities as an array
    // Sorts based on total number of moves required to reach objective from spawn
    this.sortedObjectives = new _tinyqueue2.default([], function (a, b) {
      return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    });

    // for testing
    window.actors.push(this);
  }

  /**
   * Returns the elements at the edge of the Actor.
   * @return {Object} The elements and positions at each edge.
   */


  _createClass(Actor, [{
    key: 'getSurroundings',
    value: function getSurroundings() {
      // FIXME will probably crash if we check invalid indices (e.g. [-1])
      var actorRow = this.position[0];
      var actorColumn = this.position[1];
      // The elements on each of the four edges
      var edges = {
        elements: [this.simulation.area[actorRow - 1][actorColumn], // North
        this.simulation.area[actorRow][actorColumn + 1], // East
        this.simulation.area[actorRow + 1][actorColumn], // South
        this.simulation.area[actorRow][actorColumn - 1]],
        positions: [[actorRow - 1, actorColumn], // North
        [actorRow, actorColumn + 1], // East
        [actorRow + 1, actorColumn], // South
        [actorRow, actorColumn - 1]]
      };
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
      var edges = this.getSurroundings().elements;
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
        var edges = this.getSurroundings();
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = edges.elements[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var edge = _step.value;

            if (edges.includes(item)) {
              // Lower case indicates an item, rather than a spawner
              this.item = item.toLowerCase();
            } else {
              throw new Error(this.identifier + ' tried to take an item: ' + item + ' that it was not next to');
            }
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

    /**
     * Starts the Actor's pathfinding goals.
     * @param {Integer} time The time between moves in milliseconds
     */

  }, {
    key: 'activate',
    value: function activate(time) {
      this.searcher = new _aStarSearch.AStarSearch(this.simulation, this, this.config.heuristic);
      while (this.objective !== undefined) {}
      // let path = this.searcher.
      // setInterval(time)
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

},{"./pathfinding/a-star-search.js":3,"tinyqueue":1}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AStarSearch = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _tinyqueue = require("tinyqueue");

var _tinyqueue2 = _interopRequireDefault(_tinyqueue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// let TinyQueue = require('tinyqueue');
/**
 * A* needs checks each possible next move (i.e. N,E,S,W) and selects the one which
 * the heuristic says is closest.
 * Each non-start node is set to infinity. Then for each node we land on, we make its neighbours
 * cost equal the cost of the path + the cost of the current node + estimatedCostToTarget
 * (costOfEdge + costOfCurrentNode + estimatedCostToTarget)
 * The estimate is calculated by the heuristic.
 *
 * Nodes are ground elements
 * (more complex - actors which are not going to be in that position when this actor reaches it)
 * The target tile is the currently required objective (closest bricks/building site)
 * Note - closest might result in a blockage. Would need to be check for if a building site
 * was surrounded on 3 sides.
 * The heuristic could be straight-line distance (underestimate), or
 * it could be tile distance (abs(t[0]-c[0]))
 * The edge cost will always be 1.
 *
 * Checks are operated within this class. The Simulation and Actors do not deal with the
 * pathfinding logic.
 *
 *
 *
 */
var AStarSearch = exports.AStarSearch = function () {
  /**
   * Constructs the search module for use by an Actor.
   * @param {Simulation} simulation The current simulation.
   * @param {Actor}      actor      The Actor we are pathfinding for.
   * @param {Function}   heuristic  The heuristic function to use. Must return a number.
   */
  function AStarSearch(simulation, actor, heuristic) {
    _classCallCheck(this, AStarSearch);

    this.simulation = simulation;
    this.actor = actor;
    this.heuristic = heuristic;
    // The position of the next objective
    // let objective = this.actor.objective;
    // while (objective !== undefined) {}
  }

  /**
   * Calculates the shortest path between the current position and the target position.
   * Only moves on ground tiles. Recurses until a path has been found
   * or all nodes have been checked.
   * @param  {Array} current The current position of the Actor.
   * @param  {Array} target  The target position.
   * @return {Array}         The list of positions to get to the target
   */


  _createClass(AStarSearch, [{
    key: "calculateShortestPath",
    value: function calculateShortestPath(current, target) {
      return this.calculateNextStep(current, target);
    }

    /**
     * A recursive function which calculates each step of the path between the current
     * path position and the target position.
     *
     * @param {Array} path The path that has been calculated so far
     * @param {Array} target The target position
     * @param {Array} checkedTiles The tiles checked already // toto maybe useful?
     */

  }, {
    key: "calculateNextStep",
    value: function (_calculateNextStep) {
      function calculateNextStep(_x, _x2) {
        return _calculateNextStep.apply(this, arguments);
      }

      calculateNextStep.toString = function () {
        return _calculateNextStep.toString();
      };

      return calculateNextStep;
    }(function (path, target) {
      var currentNode = path[path.length - 1];
      var orderedQueue = new _tinyqueue2.default([], function (a, b) {
        return a.cost - b.cost;
      });

      var tiles = this.getValidEdges(currentNode.position);
      // If we are next to the target, we have finished searching
      if (tiles.includes(target)) {
        return path.push(target);
      }

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = tiles[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var tile = _step.value;

          // Populate array of tiles from lowest-cost to highest cost
          var cost = 1 + tile.cost + this.heuristic(currentNode.position, target);
          orderedQueue.push({
            position: tile,
            cost: cost
          });
        }
        // Convert the non-iterable priority queue into an array
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

      var orderedTiles = [];
      while (_tinyqueue2.default.length > 0) {
        orderedTiles.push(orderedQueue.pop());
      } // Iterate through each step
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = orderedTiles[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _tile = _step2.value;

          if (!path.includes(_tile.position)) {
            var continuedRoute = calculateNextStep(path.push(_tile.position), target);
            if (continuedRoute !== null) {
              return continuedRoute;
            }
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return null;
    })

    /**
     * Returns the positions of the ground tiles around the specified tile
     * @param {Array} position The position
     * @return {Array} The ground tiles
     */

  }, {
    key: "getValidEdges",
    value: function getValidEdges(position) {
      // let edges = this.actor.getSurroundings();
      var edges = {
        elements: [this.simulation.area[(position[0] - 1, position[1])], // North
        this.simulation.area[(position[0], position[1] + 1)], // East
        this.simulation.area[(position[0] + 1, position[1])], // South
        this.simulation.area[(position[0], position[1] - 1)] // West
        ],
        positions: [[position[0] - 1, position[1]], [position[0], position[1] + 1], [position[0] + 1, position[1]], [position[0], position[1] - 1]]
      };
      var validEdges = [];
      for (var index = 0; index < edges.elements.length; index++) {
        if (this.actor.config.ground.includes(edges.elements[index])) {
          validEdges.push(edges.positions[index]);
        }
      }
      if (validEdges.length === 0 && !edges.elements.includes("A")) {
        throw new Error(this.actor.identifier + " is surrounded by immovable objects");
      } else if (validEdges.length === 0) {
        // There is an actor blocking us in
        throw new Error(this.actor.identifier + " is being blocked in by another Actor");
      }
      return validEdges;
    }
  }]);

  return AStarSearch;
}();

},{"tinyqueue":1}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Simulation = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _actor = require('./actor.js');

var _tinyqueue = require('tinyqueue');

var _tinyqueue2 = _interopRequireDefault(_tinyqueue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

    window.testQueue = new _tinyqueue2.default([], function (a, b) {
      return Math.abs(1 - a[0]) + Math.abs(1 - a[1]) - (Math.abs(1 - b[0]) + Math.abs(1 - b[1]));
    });

    this.config = simulationConfig;

    this.area = this.config.simulationArea;

    // Store the actors
    this.actors = [];
    // Stores the current paths for each actor
    this.paths = {};
    // Stores the objective locations so we can tell when they have been built
    this.objectiveSpaces = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = this.config.objectiveElements[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var objective = _step.value;

        this.objectiveSpaces = this.objectiveSpaces.concat(this._findPosition(objective));
      }

      // Create the Actors
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
        heuristic: this.config.pathfindingHeuristic
      };
      var actor = new _actor.Actor(actorConfig, this);
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
     * Returns the element at the specified position
     * @param {Array} position The position to check in the form [row, column]
     */

  }, {
    key: 'getElement',
    value: function getElement(position) {
      return this.area[position[0]][position[1]];
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
     * Calculates the tile distance between the two positions
     * @param  {Array}   firstPosition  The first position
     * @param  {Array}   secondPosition The second position
     * @return {Integer}                The tile distance (i.e. not straight-line)
     */

  }, {
    key: 'findDistance',
    value: function findDistance(firstPosition, secondPosition) {
      var distance = void 0;

      return distance;
    }

    /**
     * Prints the simulation map (for a terminal game)
     */

  }, {
    key: 'print',
    value: function print() {
      var simulationArea = this.area;
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = simulationArea[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var row = _step2.value;

          console.log(row);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
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

},{"./actor.js":2,"tinyqueue":1}]},{},[4]);
