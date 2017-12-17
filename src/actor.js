import { AStarSearch } from "./pathfinding/a-star-search.js";
import TinyQueue from "tinyqueue";

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
export class Actor {
  /**
   * Create a new basic Actor
   * @param {Object}     config      The config settings for Actors
   * @param {String}     identifier The unique identifier for this Actor
   * @param {Integer}    priority   The priority to use in path disputes - lower value means higher importance
   * @param {Array}      position   The coordinates of the starting position
   * @param {Simulation} simulation The Simulation to broadcast position, route, objective point to
   */
  constructor(config, simulation) {
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
    let objectivePriorityQueue = new TinyQueue(
      this.config.objectiveSpaces,
      (a, b) => {
        return (
          Math.abs(this.position[0] - a[0]) +
          Math.abs(this.position[1] - a[1]) -
          (Math.abs(this.position[0] - b[0]) +
            Math.abs(this.position[1] - b[1]))
        );
      }
    );
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
  getSurroundings() {
    // FIXME will probably crash if we check invalid indices (e.g. [-1])
    let actorRow = this.position[0];
    let actorColumn = this.position[1];
    // The elements on each of the four edges
    let edges = {
      elements: [
        this.simulation.area[actorRow - 1][actorColumn], // North
        this.simulation.area[actorRow][actorColumn + 1], // East
        this.simulation.area[actorRow + 1][actorColumn], // South
        this.simulation.area[actorRow][actorColumn - 1] // West
      ],
      positions: [
        [actorRow - 1, actorColumn], // North
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
  getPosition() {
    return this.position;
  }

  /**
   * Moves the Actor to the specified position if valid
   * @param {Array} position The position to move to
   */
  _move(position) {
    let edges = this.getSurroundings();
    if (arrayHolds(edges.positions, position)) {
      // If we're trying to move into a ground element...
      if (
        this.config.ground.includes(
          edges.elements[getArrayIndex(edges.positions, position)]
        )
      ) {
        this.simulation.swapElements(this.position, position);
        this.position = position;
      } else {
        throw new Error(
          this.identifier + " tried to move into an invalid element."
        );
      }
    } else {
      throw new Error(
        this.identifier +
          " tried to move to a position " +
          position +
          " that it was not next to."
      );
    }
    this.simulation.gui.updateGui(this.simulation.area);
  }

  /**
   * Picks up the specified item if it is next to one
   * @param {String} item An item element
   */
  takeItem(item) {
    if (this.config.items.includes(item)) {
      let edges = this.getSurroundings();
      if (edges.elements.includes(item)) {
        // Lower case indicates an item, rather than a spawner
        this._item = item.toLowerCase();
      } else {
        throw new Error(
          this.identifier +
            " tried to take an item: " +
            item +
            " that it was not next to"
        );
      }
    } else {
      throw new Error(
        this.identifier + "tried to take an unspecified item: " + item
      );
    }
    this.simulation.gui.updateGui(this.simulation.area);
  }

  /**
   * Places the currently held item in the position
   * @param {Array} position The position to place the item in
   */
  placeItem(position) {
    if (this._item !== undefined) {
      this.simulation.replaceElement(position, this._item);
      this._item = undefined;
    } else {
      throw new Error(
        this.identifier + " tried to place an item while it was not holding one"
      );
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
  activate(time = 500) {
    this.time = time;
    this.blacklist.length = 0;
    // Check that we have tasks to perform
    if (this.sortedObjectives.length > 0) {
      if (this.path.length === 0) {
        this.path = this.calculateNewPath();
      }
      if (this.path === undefined) {
        throw new Error('this.path was undefined');
      }
      // If we aren't next to the goal we have to move
      console.log(JSON.stringify(this.path));
      if (this.path.length > 0) {
        this.status = "moving";
      } else if (this._item === undefined) {
        this.status === "retrieving";
      } else {
        this.status === "placing";
      }
      // This interval will be cleared by the Actor placing an item, or by being interrupted by a
      // higher priority Actor.
      this.interval = setInterval(() => {
        this.operate();
      }, time);
    }
  }

  /**
   * Performs a task and sets the Actor ready for the next operation.
   */
  operate() {
    if (this.simulation.objectives[this.objective] === undefined) {
      console.log(this.identifier + " switching objective");
      this.sortedObjectives.shift();
      this.objective = this.sortedObjectives[0];
      this.status = "inactive";
      clearInterval(this.interval);
      this.interval = undefined;
      // Automatically reactivate while there are still objectives to complete
      if (this.objective !== undefined) {
        this.activate(this.time);
      }
    }
    switch (this.status) {
      case "moving":
        // Check that the path is clear - if not we will recalculate the path
        if (
          this.config.ground.includes(this.simulation.getElement(this.path[0]))
        ) {
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
          for (let actor of this.simulation.actors) {
            if (actor.position === this.path[0]) {
              if (
                this.priority < actor.priority ||
                actor.status === "inactive"
              ) {
                this.status = "inactive";
                clearInterval(this.interval);
                this.interval = undefined;
                // Automatically reactivates to calculate an alternate route
                this.activate(this.time);
              }
            }
          }
        }
        break;
      case "retrieving":
        this.takeItem("B");
        this.dispenser = undefined;
        let surroundings = this.getSurroundings();
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

  /**
   * Finds a new path and returns it
   */
  calculateNewPath() {
    // We will return path at the end. It will be set to the calculated path.
    let path;

    this.searcher = new AStarSearch(
      this.simulation,
      this,
      this.config.heuristic
    );
    this.objective = this.sortedObjectives[0];
    // Check that objective is not the same as another actor
    for (let actor of this.simulation.actors) {
      // If two objectives are the same and this Actor has a lower priority
      if (
        this.objective === actor.objective &&
        actor.identifier !== this.identifier &&
        this.priority < actor.priority &&
        actor.status !== 'inactive'
      ) {
        this.sortedObjectives.shift();
        this.objective = this.sortedObjectives[0];
      } else if (
        this.objective === actor.objective &&
        actor.identifier !== this.identifier &&
        actor.status !== 'inactive'
      ) {
        this.simulation.interruptInterval(actor.identifier);
      }
    }
    // Calculate a path to either a dispenser or an objective
    if (this.objective !== undefined) {
      // Replace the Actor's position with a temporary 'clear' value
      let actorArea = Array.from(this.simulation.area);
      replaceElement(actorArea, this.position, "a");
      if (this._item === undefined) {
        // If we aren't holding an item, go to the nearest dispenser
        // We sort the dispensers
        let distanceSortedDispensers = new TinyQueue(
          this.simulation.itemSpaces,
          function(a, b) {
            return (
              Math.abs(this.position[0] - a[0]) +
              Math.abs(this.position[1] - a[1]) -
              (Math.abs(this.position[0] - b[0]) +
                Math.abs(this.position[1] - b[1]))
            );
          }
        );
        // Pick the nearest one
        this.dispenser = distanceSortedDispensers.peek();
        path = this.searcher.calculateShortestPath(
          this.position,
          this.dispenser,
          actorArea
        );
      } else {
        path = this.searcher.calculateShortestPath(
          this.position,
          this.objective,
          actorArea
        );
      }
      // // Check that there is a path to follow
      // if (path === null || path === undefined || path === '' || path === false || path === 0 || path === NaN) {
      //   throw new Error(
      //     "Path contained null values. Path returned as: " + path
      //   );
      // }

      // Check that the path won't cause a collision with another Actor
      // If it will, recalculate with those tiles blacklisted
      for (let actor of this.simulation.actors) {
        for (let index = 0; index < path.length; index++) {
          if (
            arraysEqual(path[index], actor.path[index]) &&
            this.priority < actor.priority
          ) {
            // Set the position as impassable for this Actor
            this.blacklist.push(path[index]);
          }
        }
      }
      // If any collision points have been identified, recalculate the path
      if (this.blacklist.length > 0) {
        if (this.dispenser !== undefined) {
          path = this.searcher.calculateShortestPath(
            this.position,
            this.dispenser,
            actorArea
          );
        } else {
          path = this.searcher.calculateShortestPath(
            this.position,
            this.objective,
            actorArea
          );
        }
      }

      // // Check that there is a path to follow
      // if (path === null || path === undefined || path === '' || path === false || path === 0 || path === NaN) {
      //   throw new Error(
      //     "Path contained null values. Path returned as: " + path
      //   );
      // }

      // Clean the Actor up
      if (path === undefined) {
        console.log('path is undefined in actor');
      }
      replaceElement(actorArea, this.position, "A");
      return path;
    }
  }
}

/**
 * Checks whether two arrays are identical.
 * Code taken from https://stackoverflow.com/questions/4025893/how-to-check-identical-array-in-most-efficient-way
 * @param {Array} arr1 An array
 * @param {Array} arr2 Another array
 */
export function arraysEqual(arr1, arr2) {
  if (arr1 === undefined || arr2 === undefined) {
    return false;
  } else if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = arr1.length; i--; ) {
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
export function arrayHolds(arr, item) {
  let itemAsString = JSON.stringify(item);
  let contains = arr.some(function(ele) {
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
export function getArrayIndex(containerArray, findArray) {
  if (
    Array.isArray(containerArray) === false ||
    Array.isArray(findArray) === false
  ) {
    throw new Error(
      "Parameters " +
        containerArray +
        " and " +
        findArray +
        " must both be Arrays."
    );
  }
  for (let i = containerArray.length; i--; ) {
    if (
      JSON.stringify(containerArray[i][0]) === JSON.stringify(findArray[0]) &&
      JSON.stringify(containerArray[i][1]) === JSON.stringify(findArray[1])
    ) {
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
export function replaceElement(area, position, newElement) {
  area[position[0]][position[1]] = newElement;
}
