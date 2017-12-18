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

exports.arraysEqual = arraysEqual;
exports.arrayHolds = arrayHolds;
exports.getArrayIndex = getArrayIndex;
exports.replaceElement = replaceElement;

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
 *
 * We might need (want) a 3D array so that we can more easily model an Actor
 * standing on top of an Objective tile to get to an otherwise-inaccessible Goal
 *
 * Recalculating the path if there's an Actor in the way is probably massive overkill
 * A better solution would be to wait for the Actor to move. However if two Actors were
 * trying to get past each other in a narrow chokepoint, there would have to be a priority
 * challenge, with a pathfind to back up out of the way of the greater priority
 *
 * It would probabky be better to have the actual Acotr moving about, rather than an 'A'
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

    // Whether the Actor is carrying an item
    this._item = undefined;
    // The position of the Actor
    this.position = config.startingPosition;
    // The current objective position of the Actor
    this.objective = undefined;
    // Will be set to the nearest item dispenser
    this.dispenser = undefined;

    // The interval for when this Actor is activated
    this.interval = undefined;
    // The time for the interval
    this.time = undefined;

    // The current path of the Actor
    this.path = [];
    // The current status of the Actor
    this.status = "inactive";
    // The list of blacklisted positions for this Actor
    this.blacklist = [];

    // Objective priorities as an array
    this.sortedObjectives = [];
    // Sorts based on total number of moves required to reach objective from spawn
    var objectivePriorityQueue = new _tinyqueue2.default(this.config.objectiveSpaces, function (a, b) {
      return Math.abs(_this.position[0] - a[0]) + Math.abs(_this.position[1] - a[1]) - (Math.abs(_this.position[0] - b[0]) + Math.abs(_this.position[1] - b[1]));
    });
    while (objectivePriorityQueue.length > 0) {
      this.sortedObjectives.push(objectivePriorityQueue.pop());
    }

    // The searcher we will use
    this.searcher = new _aStarSearch.AStarSearch(this.simulation, this, this.config.heuristic);

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
      if (arrayHolds(edges.positions, position)) {
        // If we're trying to move into a ground element...
        if (this.config.ground.includes(edges.elements[getArrayIndex(edges.positions, position)])) {
          this.simulation.swapElements(this.position, position);
          this.position = position;
        } else {
          throw new Error(this.identifier + " tried to move into an invalid element.");
        }
      } else {
        throw new Error(this.identifier + " tried to move to a position " + position + " that it was not next to.");
      }
      this.simulation.gui.updateGui(this.simulation.area);
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
        if (edges.elements.includes(item)) {
          // Lower case indicates an item, rather than a spawner
          this._item = item.toLowerCase();
        } else {
          throw new Error(this.identifier + " tried to take an item: " + item + " that it was not next to");
        }
      } else {
        throw new Error(this.identifier + "tried to take an unspecified item: " + item);
      }
      this.simulation.gui.updateGui(this.simulation.area);
    }

    /**
     * Places the currently held item in the position
     * @param {Array} position The position to place the item in
     */

  }, {
    key: "placeItem",
    value: function placeItem(position) {
      if (this._item !== undefined) {
        this.simulation.replaceElement(position, this._item);
        this._item = undefined;
      } else {
        throw new Error(this.identifier + " tried to place an item while it was not holding one");
      }
      this.simulation.gui.updateGui(this.simulation.area);
    }

    /**
     * Activates the Actor so it will keep performing tasks if it has any.
     * Tasks include:
     *  - moving
     *  - picking up items
     *  - placing items
     *
     * @param {Integer} time Time in ms between each task
     */

  }, {
    key: "activate",
    value: function activate() {
      var _this2 = this;

      var time = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 500;

      this.time = time;
      this.blacklist.length = 0;
      // Check that we have tasks to perform
      if (this.sortedObjectives.length > 0) {
        this.objective = this.sortedObjectives[0];
        if (this.objective !== undefined) {
          this.path = this.findNewPath();
          if (this.path !== null) {
            // If we aren't next to the goal we have to move
            if (this.path.length > 0) {
              this.status = "moving";
            } else if (this._item === undefined) {
              this.status === "retrieving";
            } else {
              this.status === "placing";
            }
            // This interval will be cleared by the Actor placing an item, or by being interrupted by a
            // higher priority Actor.
            this.interval = setInterval(function () {
              _this2.operate();
            }, time);
          }
        }
      }
    }

    /**
     * Performs a task and sets the Actor ready for the next operation.
     */

  }, {
    key: "operate",
    value: function operate() {
      // // Check that our current objective is valid - if we should be on another objective, reactivate
      // let validObjective = this.findValidObjective();
      // if (validObjective !== this.objective) {
      //   this.objective = validObjective;
      //   this.status = "inactive";
      //   clearInterval(this.interval);
      //   this.interval = undefined;
      //   // Automatically reactivate while there are still objectives to complete
      //   if (this.objective !== undefined) {
      //     this.activate(this.time);
      //   }
      // }

      if (this.simulation.objectives[this.objective] === undefined) {
        this.sortedObjectives.shift();
        this.objective = this.sortedObjectives[0];
        this.status = "inactive";
        clearInterval(this.interval);
        this.interval = undefined;
        // Automatically reactivate while there are still objectives to complete
        if (this.objective !== undefined) {
          this.activate(this.time);
        }
      } else {
        switch (this.status) {
          case "moving":
            // Check that the path is clear - if not we might recalculate the path
            var clear = true;
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = this.simulation.actors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var _actor = _step.value;

                if (_actor.identifier !== this.identifier) {
                  if (arraysEqual(this.path[0], _actor.path[0])) {
                    if (this.priority < _actor.priority) {
                      clear = false;
                    }
                  }
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

            if (this.config.ground.includes(this.simulation.getElement(this.path[0])) && !clear) {
              this.status = "inactive";
              clearInterval(this.interval);
              this.interval = undefined;
              // Automatically reactivates to calculate an alternate route
              this.activate(this.time);
            } else if (this.config.ground.includes(this.simulation.getElement(this.path[0])) && clear) {
              this._move(this.path[0]);
              this.path.shift();
              if (this.path.length === 0) {
                if (this._item === undefined) {
                  this.status = "retrieving";
                } else {
                  this.status = "placing";
                }
              }
            } else if (this.simulation.getElement(this.path[0]) === "A") {
              // Find the Actor that's in the way, and perform a priority challenge.
              // If it loses the challenge, we recalculate. If it wins, wait one tick.
              var _iteratorNormalCompletion2 = true;
              var _didIteratorError2 = false;
              var _iteratorError2 = undefined;

              try {
                for (var _iterator2 = this.simulation.actors[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                  var actor = _step2.value;

                  if (actor.position === this.path[0]) {
                    if (this.priority < actor.priority || actor.status === "inactive") {
                      this.status = "inactive";
                      clearInterval(this.interval);
                      this.interval = undefined;
                      // Automatically reactivates to calculate an alternate route
                      this.activate(this.time);
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
            }
            break;
          case "retrieving":
            this.takeItem("B");
            this.dispenser = undefined;
            var surroundings = this.getSurroundings();
            if (arrayHolds(surroundings.positions, this.objective)) {
              this.status = "placing";
            } else {
              this.status = "inactive";
              clearInterval(this.interval);
              this.interval = undefined;
              // Automatically reactivate while there are still objectives to complete
              if (this.objective !== undefined) {
                this.activate(this.time);
              }
            }
            break;
          case "placing":
            this.placeItem(this.objective);
            this.sortedObjectives.shift();
            delete this.simulation.objectives[this.objective];
            this.objective = this.sortedObjectives[0];
            this.status = "inactive";
            clearInterval(this.interval);
            this.interval = undefined;
            // Automatically reactivate while there are still objectives to complete
            if (this.objective !== undefined) {
              this.activate(this.time);
            }
            break;
        }
      }
    }

    /**
     * Finds a new path and returns it
     */

  }, {
    key: "calculateNewPath",
    value: function calculateNewPath() {
      // We will return path at the end. It will be set to the calculated path.
      var path = [];

      this.searcher = new _aStarSearch.AStarSearch(this.simulation, this, this.config.heuristic);
      // Check that objective is not the same as another actor
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.simulation.actors[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var _actor2 = _step3.value;

          // If two objectives are the same and this Actor has a lower priority
          if (arraysEqual(this.objective, _actor2.objective) && _actor2.identifier !== this.identifier && this.priority < _actor2.priority && _actor2.status !== "inactive") {
            this.sortedObjectives.shift();
            this.objective = this.sortedObjectives[0];
          } else if (arraysEqual(this.objective, _actor2.objective) && _actor2.identifier !== this.identifier && _actor2.status !== "inactive") {
            this.simulation.interruptInterval(_actor2.identifier);
          }
        }
        // Calculate a path to either a dispenser or an objective
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

      if (this.objective !== undefined) {
        // Replace the Actor's position with a temporary 'clear' value
        var actorArea = Array.from(this.simulation.area);
        replaceElement(actorArea, this.position, "a");
        if (this._item === undefined) {
          // If we aren't holding an item, go to the nearest dispenser
          // We sort the dispensers
          var distanceSortedDispensers = new _tinyqueue2.default(this.simulation.itemSpaces, function (a, b) {
            return Math.abs(this.position[0] - a[0]) + Math.abs(this.position[1] - a[1]) - (Math.abs(this.position[0] - b[0]) + Math.abs(this.position[1] - b[1]));
          });
          // Pick the nearest one
          this.dispenser = distanceSortedDispensers.peek();
          path = this.searcher.calculateShortestPath(this.position, this.dispenser, actorArea);
        } else {
          path = this.searcher.calculateShortestPath(this.position, this.objective, actorArea);
        }
        // // Check that there is a path to follow
        // if (path === null || path === undefined || path === '' || path === false || path === 0 || path === NaN) {
        //   throw new Error(
        //     "Path contained null values. Path returned as: " + path
        //   );
        // }

        // Check that the path won't cause a collision with another Actor
        // If it will, recalculate with those tiles blacklisted
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = this.simulation.actors[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var actor = _step4.value;

            for (var index = 0; index < path.length; index++) {
              if (arraysEqual(path[index], actor.path[index]) && this.priority < actor.priority) {
                // Set the position as impassable for this Actor
                this.blacklist.push(path[index]);
              }
            }
          }
          // If any collision points have been identified, recalculate the path
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

        if (this.blacklist.length > 0) {
          if (this.dispenser !== undefined) {
            path = this.searcher.calculateShortestPath(this.position, this.dispenser, actorArea);
          } else {
            path = this.searcher.calculateShortestPath(this.position, this.objective, actorArea);
          }
        }

        // // Check that there is a path to follow
        // if (path === null || path === undefined || path === '' || path === false || path === 0 || path === NaN) {
        //   throw new Error(
        //     "Path contained null values. Path returned as: " + path
        //   );
        // }

        // Clean the Actor up
        replaceElement(actorArea, this.position, "A");
        return path;
      }
    }

    /**
     * This will return a path or null
     * It should check for collision points
     * It should find a path to either a dispenser or an objective
     * It should not check that the objective is correct, this should be done by a different method
     * It should check that the objective is defined however
     */

  }, {
    key: "findNewPath",
    value: function findNewPath() {
      var path = null;
      this.blacklist.length = 0;

      if (this.objective !== undefined) {
        // If the item is undefined, we need to go to a dispenser
        if (this._item === undefined) {
          // Sort the dispensers by distance
          var distanceSortedDispensers = new _tinyqueue2.default(this.simulation.itemSpaces, function (a, b) {
            return Math.abs(this.position[0] - a[0]) + Math.abs(this.position[1] - a[1]) - (Math.abs(this.position[0] - b[0]) + Math.abs(this.position[1] - b[1]));
          });
          // Pick the nearest one
          this.dispenser = distanceSortedDispensers.peek();
          // Find a path to it
          path = this.searcher.calculateShortestPath(this.position, this.dispenser, this.simulation.area);
        } else {
          path = this.searcher.calculateShortestPath(this.position, this.objective, this.simulation.area);
        }
        // We need to check that we won't collide with another Actor
        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          for (var _iterator5 = this.simulation.actors[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var actor = _step5.value;

            if (actor.identifier !== this.identifier) {
              for (var i = 0; i < path.length; i++) {
                if (arraysEqual(this.path[i], actor.path[i])) {
                  if (this.priority < actor.priority) {
                    this.blacklist.push(this.path[i]);
                  }
                }
              }
            }
          }
          // If we blacklisted some positions, recalculate the path
        } catch (err) {
          _didIteratorError5 = true;
          _iteratorError5 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion5 && _iterator5.return) {
              _iterator5.return();
            }
          } finally {
            if (_didIteratorError5) {
              throw _iteratorError5;
            }
          }
        }

        if (this.blacklist.length > 0) {
          // If the item is undefined, we need to go to a dispenser
          if (this._item === undefined) {
            path = this.searcher.calculateShortestPath(this.position, this.dispenser, this.simulation.area);
          } else {
            path = this.searcher.calculateShortestPath(this.position, this.objective, this.simulation.area);
          }
        }
      }

      return path;
    }

    /**
     * Looks at the objectives for this Actor and returns the first objective that has not been completed
     * and that is not currently being completed by another Actor, or undefined if no valid objective can
     * be found.
     * @return {Array} The position for the next objective
     */

  }, {
    key: "findValidObjective",
    value: function findValidObjective() {
      for (var i = 0; i < this.sortedObjectives.length; i++) {
        var objective = this.sortedObjectives[i];
        // for (let objective of this.sortedObjectives) {
        if (this.simulation.objectives[objective] !== undefined) {
          var clear = true;
          var _iteratorNormalCompletion6 = true;
          var _didIteratorError6 = false;
          var _iteratorError6 = undefined;

          try {
            for (var _iterator6 = this.simulation.actors[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
              var actor = _step6.value;

              if (this.identifier !== actor.identifier) {
                if (objective === actor.objective) {
                  clear = false;
                }
              }
            }
          } catch (err) {
            _didIteratorError6 = true;
            _iteratorError6 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion6 && _iterator6.return) {
                _iterator6.return();
              }
            } finally {
              if (_didIteratorError6) {
                throw _iteratorError6;
              }
            }
          }

          if (clear) {
            return objective;
          } else {
            this.sortedObjectives.splice(i, 1);
            i--;
          }
        } else {
          this.sortedObjectives.splice(i, 1);
          i--;
        }
      }
      return undefined;
    }
  }]);

  return Actor;
}();

/**
 * Checks whether two arrays are identical.
 * Code taken from https://stackoverflow.com/questions/4025893/how-to-check-identical-array-in-most-efficient-way
 * @param {Array} arr1 An array
 * @param {Array} arr2 Another array
 */


function arraysEqual(arr1, arr2) {
  if (arr1 === undefined || arr2 === undefined) {
    return false;
  } else if (arr1.length !== arr2.length) {
    return false;
  }
  for (var i = arr1.length; i--;) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Taken from https://stackoverflow.com/questions/41661287/how-to-check-if-an-array-contains-another-array
 * Checks if an array contains the given item. Used when the item is an array.
 * @param {Array} arr  An Array containing Arrays
 * @param {Array} item An Array which might be contained in arr
 */
function arrayHolds(arr, item) {
  var itemAsString = JSON.stringify(item);
  var contains = arr.some(function (ele) {
    return JSON.stringify(ele) === itemAsString;
  });
  return contains;
}

/**
 * Returns the index of an array contained within an array, or -1 if not found.
 * @param  {Array}   containerArray The Array to search in.
 * @param  {Array}   findArray      The Array to search for.
 * @return {Integer}                The index of findArray, or -1.
 */
function getArrayIndex(containerArray, findArray) {
  if (Array.isArray(containerArray) === false || Array.isArray(findArray) === false) {
    throw new Error("Parameters " + containerArray + " and " + findArray + " must both be Arrays.");
  }
  for (var i = containerArray.length; i--;) {
    if (JSON.stringify(containerArray[i][0]) === JSON.stringify(findArray[0]) && JSON.stringify(containerArray[i][1]) === JSON.stringify(findArray[1])) {
      return i;
    }
  }
  return -1;
}

/**
 * Replaces the element currently in the position with the new element
 * @param {Array}  area       The area we're operating in
 * @param {Array}  position   The position to replace an element at
 * @param {String} newElement The element to replace with
 */
function replaceElement(area, position, newElement) {
  area[position[0]][position[1]] = newElement;
}

},{"./pathfinding/a-star-search.js":4,"tinyqueue":1}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var terminalGui = exports.terminalGui = function () {

  /**
   * Loads the output textarea onto the page
   */
  function terminalGui(rows, columns) {
    _classCallCheck(this, terminalGui);

    var outputArea = document.getElementById('simulation');
    this.output = document.createElement('textarea');
    this.output.style.fontSize = '20px';
    this.output.style.overflow = 'visible';
    this.output.rows = rows * 2;
    this.output.cols = columns * 2;
    outputArea.appendChild(this.output);
  }

  /**
   * Clears the current display and displays the new area
   * @param {Array} area The simulation area - will only work for 2D maps
   */


  _createClass(terminalGui, [{
    key: 'updateGui',
    value: function updateGui(area) {
      this.output.value = '';
      var display = '';
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = area[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var row = _step.value;

          display = display.concat(row.toString().replace(/,/g, ' ') + '\n');
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

      this.output.value = display;
    }
  }]);

  return terminalGui;
}();

},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AStarSearch = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _tinyqueue = require("tinyqueue");

var _tinyqueue2 = _interopRequireDefault(_tinyqueue);

var _actor = require("../actor");

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
 * Analysis - some time is wasted in one of the for loops in _calculateNextStep()
 *          - using the current node as the first step in the path is wasteful
 *            It would be more efficient to have a for loop for the valid first
 *            steps - this would be code duplication from the _calculateNextSteps()
 *            in the calculateShortestPath method however.
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
    this.path = [];
    this.blacklistedNodes = [];
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

      // The node we will start searching from
      var currentNode = {
        position: current,
        cost: 0,
        previous: null
      };
      // The node we are searching for
      this.target = target;
      // Tracks the currently active nodes
      this.activeNodes = new _tinyqueue2.default([currentNode], function (a, b) {
        return a.cost - b.cost;
      });
      // Tracks the already-checked nodes
      this.checkedPositions = [];

      // Will keep expanding nodes until the target is the best node, or all nodes have been expanded
      this._findBestPath();
      // Constructs the path by tracing the previousNode pointers back to the start
      this.path.length = 0;
      this._constructPath(this.activeNodes.peek());
      return this.path;
    }
  }, {
    key: "_findBestPath",
    value: function _findBestPath() {
      // If the best node is not the target node, we continue searching
      var bestNode = this.activeNodes.peek();
      if (bestNode !== undefined) {
        if (!(0, _actor.arraysEqual)(bestNode.position, this.target)) {
          this._exploreNode(bestNode);
        }
      }
    }
  }, {
    key: "_exploreNode",
    value: function _exploreNode(node) {
      // Remove this node from the list of active nodes
      this.activeNodes.pop();
      this.checkedPositions.push(node.position);
      var edges = this.getValidNextEdgePositions(node.position);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = edges[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var edge = _step.value;

          var nextNode = {
            position: edge,
            cost: 1 + node.cost + this.heuristic(edge, this.target),
            previous: node
          };
          this.activeNodes.push(nextNode);
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

      this._findBestPath();
    }
  }, {
    key: "_constructPath",
    value: function _constructPath(node) {
      // If node is undefined, there is no valid path to the target
      if (node !== undefined) {
        if (node.previous !== null) {
          // We don't want to add the target to our path, as we will only navigate next to a target
          if (!(0, _actor.arraysEqual)(node.position, this.target)) {
            this.path.unshift(node.position);
          }
          this._constructPath(node.previous);
        }
      } else {
        this.path = null;
      }
    }

    /**
     * Returns the positions of the ground and goal tiles around the specified tile
     * @param {Array} position The position
     * @return {Array} The ground tiles
     */

  }, {
    key: "getValidNextEdgePositions",
    value: function getValidNextEdgePositions(position) {
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
        // Valid edges are ground elements, the Actor's dispenser, the Actor's objective, or the Actor itself
        if ((this.actor.config.ground.includes(edges.elements[index]) || (0, _actor.arraysEqual)(this.actor.dispenser, edges.positions[index]) || (0, _actor.arraysEqual)(this.actor.objective, edges.positions[index]) || (0, _actor.arraysEqual)(this.actor.position, edges.positions[index])) && !(0, _actor.arrayHolds)(this.checkedPositions, edges.positions[index]) && !(0, _actor.arrayHolds)(this.actor.blacklist, edges.positions[index])) {
          validEdges.push(edges.positions[index]);
        }
      }
      // We check if any of the invalid edges were checked before - if they were, we want to return an empty array to indicate the fact
      if (validEdges.length === 0 && !edges.elements.includes("A") && !arrayHoldsAny(this.checkedPositions, edges.positions)) {
        throw new Error(this.actor.identifier + " is surrounded by immovable objects");
      } else if (validEdges.length === 0 && !arrayHoldsAny(this.checkedPositions, edges.positions)) {
        // There is an actor blocking us in
        throw new Error(this.actor.identifier + " is being blocked in by another Actor");
      }
      return validEdges;
    }
  }]);

  return AStarSearch;
}();

/**
 * Checks if an Array holds any of the arrays contained in the items parameter
 * @param  {Array}   arr   The Array we are checking
 * @param  {Array}   items An Array of Arrays
 * @return {Boolean}
 */


function arrayHoldsAny(arr, items) {
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = items[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var item = _step2.value;

      var holds = (0, _actor.arrayHolds)(arr, item);
      if (holds === true) {
        return true;
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

  return false;
}

},{"../actor":2,"tinyqueue":1}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Simulation = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _actor = require('./actor.js');

var _tinyqueue = require('tinyqueue');

var _tinyqueue2 = _interopRequireDefault(_tinyqueue);

var _terminalGui = require('./gui/terminal-gui.js');

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
 * @version Basic
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
      return a.cost - b.cost;
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

      // Stores the objective locations as an object to prevent removal race conditions
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

    this.objectives = {};
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = this.objectiveSpaces[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var position = _step2.value;

        this.objectives[position] = this.getElement(position);
      }
      // Store the locations of all item dispensers
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

    this.itemSpaces = [];
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = this.config.itemElements[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var item = _step3.value;

        this.itemSpaces = this.itemSpaces.concat(this._findPosition(item));
      }

      // Create the Actors
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

    var actorPositions = this._findPosition('A');
    for (var i = 0; i < this.config.actorCount; i++) {
      var actorDetails = this.config.actorDetails[i];
      var startingPosition = actorPositions[i];
      // Take a deep copy of the objective spaces
      var objectiveSpaces = Array.from(this.objectiveSpaces);
      // Compile the rules the Actor will need
      var actorConfig = {
        identifier: actorDetails.identifier,
        priority: actorDetails.priority,
        startingPosition: startingPosition,
        items: this.config.itemElements,
        ground: this.config.groundElements,
        objectives: this.config.objectiveElements,
        objectiveSpaces: objectiveSpaces,
        heuristic: this.config.pathfindingHeuristic
      };
      var actor = new _actor.Actor(actorConfig, this);
      // Creates an entry in the actors and paths Objects with identifier as the key
      this.actors.push(actor);
      this.paths[actorDetails.identifier] = [];
    }

    // The gui we'll use to view the simulation
    this.gui = new _terminalGui.terminalGui(this.area.length, this.area[0].length);
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
      this.gui.updateGui(this.area);
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
     * Interrupts the interval for an Actor when another Actor has forced priority
     * @param {String} actorId The ID for the Actor being interrupted
     */

  }, {
    key: 'interruptInterval',
    value: function interruptInterval(actorId) {
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = this.actors[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var actor = _step4.value;

          if (actor.identifier === actorId) {
            clearInterval(actor.interval);
            actor.activate(actor.time);
          }
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
    }

    /**
     * Prints the simulation map (for a terminal game)
     */

  }, {
    key: 'print',
    value: function print() {
      var simulationArea = this.area;
      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = simulationArea[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var row = _step5.value;

          console.log(row);
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5.return) {
            _iterator5.return();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }

      console.log('');
      console.log('---------------------------------------------------');
      console.log('');
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

},{"./actor.js":2,"./gui/terminal-gui.js":3,"tinyqueue":1}]},{},[5]);
