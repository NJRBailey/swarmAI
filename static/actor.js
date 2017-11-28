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

},{}]},{},[1]);
