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
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Actor = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _aStarSearch = require("./pathfinding/a-star-search.js");

var _tinyqueue = require("tinyqueue");

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
    var _this = this;

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
    var objectivePriorityQueue = new _tinyqueue2.default(this.config.objectives, function (a, b) {
      return Math.abs(_this.position[0] - a[0]) + Math.abs(_this.position[1] - a[1]) - (Math.abs(_this.position[0] - b[0]) + Math.abs(_this.position[1] - b[1]));
    });
    this.sortedObjectives = [];
    while (objectivePriorityQueue.length > 0) {
      this.sortedObjectives.push(objectivePriorityQueue.pop());
    }

    // for testing
    window.actors.push(this);
  }

  /**
   * Returns the elements and positions at the edge of the Actor.
   * @return {Object} The elements and positions at each edge.
   */


  _createClass(Actor, [{
    key: "getSurroundings",
    value: function getSurroundings() {
      // FIXME will probably crash if we check invalid indices (e.g. [-1])
      var actorRow = this.position[0];
      var actorColumn = this.position[1];
      // The elements on each of the four edges
      var edges = {
        elements: [this.simulation.area[actorRow - 1][actorColumn], // North
        this.simulation.area[actorRow][actorColumn + 1], // East
        this.simulation.area[actorRow + 1][actorColumn], // South
        this.simulation.area[actorRow][actorColumn - 1] // West
        ],
        positions: [[actorRow - 1, actorColumn], // North
        [actorRow, actorColumn + 1], // East
        [actorRow + 1, actorColumn], // South
        [actorRow, actorColumn - 1] // West
        ]
      };
      return edges;
    }

    /**
     * Returns the current row and column of this Actor
     * @return {Array} The actor's row and column
     */

  }, {
    key: "getPosition",
    value: function getPosition() {
      return this.position;
    }

    /**
     * Moves the Actor to the specified position if valid
     * @param {Array} position The position to move to
     */

  }, {
    key: "_move",
    value: function _move(position) {
      var edges = this.getSurroundings();
      if (edges.positions.includes(position)) {
        // If we're trying to move into a ground element...
        if (this.ground.includes(edges.elements[edges.positions.indexOf(position)])) {
          this.simulation.swapElements(this.position, position);
        } else {
          throw new Error(this.identifier + ' tried to move into an invalid element.');
        }
      } else {
        throw new Error(this.identifier + ' tried to move to a position ' + position + ' that it was not next to.');
      }
      this.simulation.print();
    }

    /**
     * Moves one position in the specified direction, if allowed.
     * @param {String} direction The direction to move in | N,E,S,W
     */

  }, {
    key: "moveCardinal",
    value: function moveCardinal(direction) {
      var edges = this.getSurroundings().elements;
      switch (direction) {
        case "N":
          if (this.config.ground.includes(edges[0])) {
            var north = [this.position[0] - 1, this.position[1]];
            this.simulation.swapElements(this.position, north);
            this.position = north;
          } else {
            throw new Error("Tried to move into a: " + edges[0]);
          }
          break;
        case "E":
          if (this.config.ground.includes(edges[1])) {
            var east = [this.position[0], this.position[1] + 1];
            this.simulation.swapElements(this.position, east);
            this.position = east;
          } else {
            throw new Error("Tried to move into a: " + edges[1]);
          }
          break;
        case "S":
          if (this.config.ground.includes(edges[2])) {
            var south = [this.position[0] + 1, this.position[1]];
            this.simulation.swapElements(this.position, south);
            this.position = south;
          } else {
            throw new Error("Tried to move into a: " + edges[2]);
          }
          break;
        case "W":
          if (this.config.ground.includes(edges[3])) {
            var west = [this.position[0], this.position[1] - 1];
            this.simulation.swapElements(this.position, west);
            this.position = west;
          } else {
            throw new Error("Tried to move into a: " + edges[3]);
          }
          break;
      }
    }

    /**
     * Picks up the specified item if it is next to one
     * @param {String} item An item element
     */

  }, {
    key: "takeItem",
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
              throw new Error(this.identifier + " tried to take an item: " + item + " that it was not next to");
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
        throw new Error(this.identifier + "tried to take an unspecified item: " + item);
      }
      this.simulation.print();
    }

    /**
     * Places the currently held item in the position
     * @param {Array} position The position to place the item in
     */

  }, {
    key: "placeItem",
    value: function placeItem(position) {
      if (this.item !== undefined) {
        this.simulation.replaceElement(position, this.item);
        this.item = undefined;
      } else {
        throw new Error(this.identifier + " tried to place an item while it was not holding one");
      }
      this.simulation.print();
    }

    /**
     * Pathfind to goal
     */

  }, {
    key: "navigate",
    value: function navigate() {
      // Will be set to the nearest item dispenser
      var dispenser = void 0;

      this.searcher = new _aStarSearch.AStarSearch(this.simulation, this, this.config.heuristic);
      this.objective = this.sortedObjectives[0];
      while (this.objective !== undefined) {
        // Check that objective is not the same as another actor
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = this.simulation.actors[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var actor = _step2.value;

            if (this.objective === actor.objective && actor.identifier !== this.identifier && this.priority < actor.priority) {
              this.sortedObjectives.shift();
              this.objective = this.sortedObjectives[0];
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

        if (this.item === undefined) {
          // If we aren't holding an item, go to the nearest resource
          // We sort the resources
          var distanceSortedDispensers = new _tinyqueue2.default(this.simulation.itemSpaces, function (a, b) {
            return Math.abs(this.position[0] - a[0]) + Math.abs(this.position[1] - a[1]) - (Math.abs(this.position[0] - b[0]) + Math.abs(this.position[1] - b[1]));
          });
          // Pick the nearest one
          dispenser = distanceSortedDispensers.peek();
          console.log('calculating shortest path to dispenser');
          this.path = this.searcher.calculateShortestPath(this.position, dispenser);
          console.log('calculated shortest path to dispenser');
          console.log(this.path);
        } else {
          console.log('calculating shortest path to objective');
          this.path = this.searcher.calculateShortestPath(this.position, this.objective);
          console.log('calculated shortest path to objective');
          console.log(this.path);
        }
        // Check that there is a path to follow
        if (this.path.includes(null) || this.path === null) {
          throw new Error('Path contained null values. Path returned as: ' + this.path);
        }

        // Check that the path won't cause a collision with another Actor
        // If it will, recalculate with that tile blacklisted, and repeat until there will be no collisions

        // Holds the positions which this Actor should not travel upon to reach this goal
        var blacklistArea = this.simulation.area;
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = this.simulation.actors[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var _actor = _step3.value;

            for (var index = 0; index < path.length; index++) {
              if (this.path[index] === _actor.path[index] && this.priority < _actor.priority) {
                // Set the position as impassable for this Actor
                blacklistArea[this.path[index][0]][this.path[index][1]] = '/';
              }
            }
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }

        console.log('created blacklist area');
        // If any collision points have been identified, recalculate the path
        if (blacklistArea.length > 0) {
          if (dispenser !== undefined) {
            this.path = this.searcher.calculateShortestPath(this.position, dispenser, blacklistArea);
            console.log('calculated shortest path with blacklist');
          } else {
            this.path = this.searcher.calculateShortestPath(this.position, this.objective, blacklistArea);
            console.log('calculated shortest path with blacklist');
          }
        }
        // Now follow the path
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = this.path[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var position = _step4.value;

            this._move(position);
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }

        console.log('moved along path');
        // We're next to the goal
        if (dispenser !== undefined) {
          this.takeItem('B');
          this.simulation.print();
        } else {
          this.placeItem(this.objective);
          // Update objectives list
          delete this.simulation.objectives[this.objective];
          this.sortedObjectives.shift();
          this.objective = this.sortedObjectives.peek();
          this.simulation.print();
        }
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

},{"./pathfinding/a-star-search.js":3,"tinyqueue":1}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AStarSearch = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _tinyqueue = require('tinyqueue');

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
 * todo figure out recursion
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
   * @param  {Array} [area]  The area to search through.
   * @return {Array}         The list of positions to get to the target
   */


  _createClass(AStarSearch, [{
    key: 'calculateShortestPath',
    value: function calculateShortestPath(current, target) {
      var area = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;

      // Set the area to search
      if (area !== undefined) {
        this.area = area;
      } else {
        this.area = this.simulation.area;
      }
      return this._calculateNextStep([current], target);
    }

    /**
     * A recursive function which calculates each step of the path between the current
     * path position and the target position.
     *
     * @param {Array} path   The path that has been calculated so far
     * @param {Array} target The target position
     * @param {Array} [area] The area to search through
     */

  }, {
    key: '_calculateNextStep',
    value: function _calculateNextStep(path, target) {
      var currentNode = path[path.length - 1];
      console.log('path: ' + path);
      console.log('currentNode: ' + currentNode);
      // Queue in order of estimated cost
      var orderedQueue = new _tinyqueue2.default([], function (a, b) {
        return a.cost - b.cost;
      });

      var tiles = this.getValidEdges(currentNode);
      // If we are next to the target, we have finished searching
      console.log("tiles");
      console.log(tiles);
      console.log("target");
      console.log(target);
      if (tiles.includes(target)) {
        console.log('Target found, returning path');
        return path;
      } else if (currentNode === target) {
        throw new Error('Trying to pathfind to the current position.');
      } else {
        // We need to search for the next step
        // Populate array of tiles from lowest cost to highest cost
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = tiles[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var tile = _step.value;

            // The first tile won't have a cost or position associated with it yet
            if (tile.cost === undefined) {
              tile.cost = 0;
              tile.position = [tile[0], tile[1]];
            }
            // let cost = 1 + tile.cost + this.heuristic(currentNode, target);
            var cost = 1 + tile.cost + this.heuristic(tile.position, target);

            console.log('cost: ' + cost);
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
        while (orderedQueue.length > 0) {
          orderedTiles.push(orderedQueue.pop());
        }

        // Iterate through each step
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = orderedTiles[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _tile = _step2.value;

            console.log(_tile);
            if (!path.includes(_tile.position)) {
              console.log('recursing deeper');
              console.log('tile: ' + JSON.stringify(_tile));
              // Add this tile as the next step in the path
              path.push(_tile.position);
              var continuedRoute = this._calculateNextStep(path, // TODO The path should be an array of objects with positions and costs.
              // The position and cost can be used on each iteration.
              // Then the calculateShortestPath() method can just grab the positions from the returned path
              // Alternatively pass a path, a target, and a current node (node has the cost, path gets added to)
              // But easier to get working due to way it's written with first solution
              target);
              if (continuedRoute !== null) {
                console.log('returned route was not null, returning path');
                return continuedRoute;
              }
              path.pop();
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

        console.log('all possible routes from the current tile returned null');
        return null;
      }
    }

    /**
     * Returns the positions of the ground tiles around the specified tile
     * @param {Array} position The position
     * @return {Array} The ground tiles
     */

  }, {
    key: 'getValidEdges',
    value: function getValidEdges(position) {
      // let edges = this.actor.getSurroundings();
      var edges = {
        elements: [this.area[position[0] - 1][position[1]], // North
        this.area[position[0]][position[1] + 1], // East
        this.area[position[0] + 1][position[1]], // South
        this.area[position[0]][position[1] - 1] // West
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

},{"tinyqueue":1}]},{},[2]);
