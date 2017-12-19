(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var terminalGui = exports.terminalGui = function () {
  /**
   * Loads the output textarea onto the page
   */
  function terminalGui(rows, columns, simulation) {
    var _this = this;

    _classCallCheck(this, terminalGui);

    this.simulation = simulation;
    var outputArea = document.getElementById("simulation");
    var controls = document.createElement("div");
    var display = document.createElement("div");
    var keyArea = document.createElement("div");

    outputArea.appendChild(controls);
    outputArea.appendChild(display);
    outputArea.appendChild(keyArea);

    this.tickTimeLabel = document.createElement("label");
    this.tickTimeLabel.innerHTML = "Tick time: ";
    controls.appendChild(this.tickTimeLabel);

    this.tickTimeInput = document.createElement("textarea");
    this.tickTimeInput.style.resize = "none";
    this.tickTimeInput.value = 500;
    this.tickTimeInput.rows = 1;
    this.tickTimeInput.cols = 5;
    controls.appendChild(this.tickTimeInput);

    this.activate = document.createElement("button");
    this.activate.innerHTML = "Activate simulation";
    this.activate.addEventListener("click", function () {
      _this.simulation.activateAll(_this.tickTimeInput.value);
    });
    controls.appendChild(this.activate);

    this.output = document.createElement("textarea");
    this.output.style.fontSize = "30px";
    this.output.style.overflow = "visible";
    this.output.rows = rows + 1;
    this.output.cols = columns * 2;
    this.output.style.resize = "none";
    display.appendChild(this.output);

    this.key = document.createElement("p");
    this.key.innerHTML = "Key:<br>Ground Tiles: " + this.simulation.config.groundElements + "<br> Bots: A<br> Dispensers: " + this.simulation.config.itemElements + "<br> Objective Zones: " + this.simulation.config.objectiveElements;
    keyArea.appendChild(this.key);
  }

  /**
   * Clears the current display and displays the new area
   * @param {Array} area The simulation area - will only work for 2D maps
   */


  _createClass(terminalGui, [{
    key: "updateGui",
    value: function updateGui(area) {
      this.output.value = "";
      var display = "";
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = area[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var row = _step.value;

          display = display.concat(row.toString().replace(/,/g, " ") + "\n");
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

},{}]},{},[1]);
