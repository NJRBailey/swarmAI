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
   * @param  {Array} [area]  The area to search through.
   * @return {Array}         The list of positions to get to the target
   */


  _createClass(AStarSearch, [{
    key: "calculateShortestPath",
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
    key: "_calculateNextStep",
    value: function (_calculateNextStep2) {
      function _calculateNextStep(_x, _x2) {
        return _calculateNextStep2.apply(this, arguments);
      }

      _calculateNextStep.toString = function () {
        return _calculateNextStep2.toString();
      };

      return _calculateNextStep;
    }(function (path, target) {
      var currentNode = path[path.length - 1];
      var orderedQueue = new _tinyqueue2.default([], function (a, b) {
        return a.cost - b.cost;
      });

      var tiles = this.getValidEdges(currentNode.position);
      // If we are next to the target, we have finished searching
      if (tiles.includes(target)) {
        return path;
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
            var continuedRoute = _calculateNextStep(path.push(_tile.position), target);
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
        elements: [this.area[(position[0] - 1, position[1])], // North
        this.area[(position[0], position[1] + 1)], // East
        this.area[(position[0] + 1, position[1])], // South
        this.area[(position[0], position[1] - 1)] // West
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
