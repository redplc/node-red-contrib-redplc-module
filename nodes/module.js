/**
 * Copyright 2021 Ocean (iot.redplc@gmail.com).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

"use strict";

module.exports = function (RED) {

	const syslib = require('./lib/syslib.js');

	RED.nodes.registerType("module-update", function(n) {
		var node = this;
		RED.nodes.createNode(node, n);
		
		node.tupdate = n.tupdate;
		node.updateout = false;

		syslib.setStatus(node, "t=" + node.tupdate + "ms");

		node.id_tupdate = setInterval(function () {
			if (node.updateout)
				node.send({ payload: "output" });
			else
				node.send({ payload: "input" });

			node.updateout = !node.updateout;	
		}, node.tupdate);
			
		node.on('close', function () {
			clearInterval(node.id_tupdate);
        });
	});

	RED.nodes.registerType("module-in", function (n) {
		var node = this;
		RED.nodes.createNode(node, n);

		node.operand = n.operand;
		node.tagname = node.operand + n.address;
		node.index = n.index;
		node.bit = n.bit;
		node.onchange = n.onchange;
		node.showvalue = n.showvalue;
		node.invert = n.invert;
		node.tofix = n.tofix;
		node.tocut = n.tocut;
		node.tupdate = n.tupdate;

		switch (node.operand) {
			case "I":
				node.name = node.tagname + "." + n.bit;
				if (node.invert)
					node.name += "*";
				break;
			case "IA":
			case "IS":
				node.name = node.tagname + "[" + n.index + "]";
		}

		node.store = node.context().global;
		node.outtxt = n.name.trim() ? n.name.trim() : node.name;
		syslib.setStatus(node, node.outtxt);

		node.id_tupdate = setInterval(function () {
			var val_read = syslib.getVariable(node, node.operand, node.tagname, node.index);

			if (val_read !== undefined) {
				switch (node.operand) {
					case "I":
						val_read = syslib.getBit(val_read, node.bit);
						if (node.invert)
							val_read = !val_read;
						break;
					case "IA":
						val_read = Number(val_read.toFixed(node.tofix));
						break;
					case "IS":
						if (node.tocut > 0)
							val_read = val_read.substr(0, node.tocut);
				}

				if (!node.onchange || (val_read !== node.preval)) {
					node.preval = val_read;
					node.send({ payload: val_read, topic: node.outtxt, label: node.outtxt});
					
					if (node.showvalue) {
						switch (node.operand) {
							case "I":
								syslib.setStatusBool(node, val_read, node.outtxt);
								break;
							default:
								syslib.setStatus(node, node.outtxt + ": " + val_read);
						}
					}
					else
						syslib.setStatus(node, node.outtxt);
				}
			}
		}, node.tupdate);

		node.on('close', function () {
			clearInterval(node.id_tupdate);
		});
	});

	RED.nodes.registerType("module-out", function (n) {
		var node = this;
		RED.nodes.createNode(node, n);

		node.operand = n.operand;
		node.tagname = node.operand + n.address;
		node.index = n.index;
		node.bit = n.bit;
		node.showvalue = n.showvalue;
		node.invert = n.invert;
		node.tofix = n.tofix;
		node.tocut = n.tocut;

		switch (node.operand) {
			case "Q":
				node.name = node.tagname + "." + n.bit;
				if (node.invert)
					node.name += "*";
				break;
			case "QA":
			case "QS":
				node.name = node.tagname + "[" + n.index + "]";
		}

		node.store = node.context().global;
		node.outtxt = n.name.trim() ? n.name.trim() : node.name;
			
		syslib.setStatus(node, node.outtxt);

		node.on("input", function (msg) {
			var val_in;
			
			switch (node.operand) {
				case "Q":
					if (typeof msg.payload !== "boolean") {
						syslib.outError(node, "not boolean", "payload not boolean");
						return;
					}
					var val_read = syslib.getVariable(node, node.operand, node.tagname);
					if (val_read === undefined)
						return;
					if (node.invert)
						msg.payload = !msg.payload;
					val_in = syslib.setBit(val_read, node.bit, msg.payload);
					break;
				case "QA":
					if (typeof msg.payload !== "number") {
						syslib.outError(node, "not number", "payload not number");
						return;
					}
					val_in = Number(msg.payload.toFixed(node.tofix));
					break;
				case "QS":
					if (typeof msg.payload !== "string") {
						syslib.outError(node, "not string", "payload not string");
						return;
					}
					if (node.tocut > 0)
						val_in = msg.payload.substr(0, node.tocut);
					else
						val_in = msg.payload;
			}
			
			if (syslib.setVariable(node, node.operand, node.tagname, node.index, val_in)) {
				if (node.showvalue) {
					switch (node.operand) {
						case "Q":
							syslib.setStatusBool(node, syslib.getBit(val_in, node.bit), node.outtxt);
							break;
						default:
							syslib.setStatus(node, node.outtxt + ": " + val_in);
					}
				}
				else
					syslib.setStatus(node, node.outtxt);
			}
		});
	});
}

