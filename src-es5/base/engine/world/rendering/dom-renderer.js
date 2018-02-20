"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _renderer = require("./renderer.js");

var _renderer2 = _interopRequireDefault(_renderer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class DOMRenderer extends _renderer2.default {
  constructor(domOwner) {
    super();
    this.domOwner = domOwner;
    this.tabActive = true;

    if (typeof window !== 'undefined') {
      $(window).focus(() => {
        this.tabActive = true;
      });
      $(window).blur(() => {
        this.tabActive = false;
      });
    }
  }

}

exports.default = DOMRenderer;