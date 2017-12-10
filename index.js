var through = require('through2'),
	gutil = require('gulp-util'),
	path = require('path'),
	fs = require('fs'),
	git = require('./lib/git');

module.exports = function (options) {
	'use strict';

	var sha = null;

	options = options || {};
	var length = options.length || 6;
	var separator = options.separator || options.seperator || '-';
	var trimRelatedPath  = options.trimRelatedPath || '';
	var manifest = '';
	var manifestData = {};
	if (options.manifest) {
		manifest = process.cwd() + '/' + options.manifest;
	} else {
		manifest = process.cwd() + '/./manifesssst.json';
	}
	var folder = !!options.folder;

	var gitshasuffix = function (file, enc, callback) {
		var stream = this,
			dir = path.dirname(file.path),
			ext = path.extname(file.relative),
			firstname = path.basename(file.relative, ext),
			finalname = null;

		var appendSuffix = function () {
			var shaSuffix = sha.substring(0, length),
				finalSuffix = separator + shaSuffix;

			if (file.isNull()) {
				file.path += finalSuffix;
				stream.push(file);
				return callback();
			}

			if (folder) {
				dir = path.join(dir, shaSuffix);
				finalSuffix = '';
			}

			file.revOrigPath = file.path;
			file.revOrigBase = file.base;
			var relativePathKey = path.relative(process.cwd(), file.path);
			file.path = path.join(dir, firstname + finalSuffix + ext);
			var relativePathValue = path.relative(process.cwd(), file.path);
			if (trimRelatedPath) {
				relativePathKey =	path.relative(trimRelatedPath, relativePathKey);
				relativePathValue =	path.relative(trimRelatedPath, relativePathValue);
			}
			manifestData[ relativePathKey ] = relativePathValue;
			stream.push(file);
			return callback();
		};

		if (sha) {
			return appendSuffix();
		}
		git.getLatestSha(function (err, latestSha) {
			if (err) {
				stream.emit('error', new gutil.PluginError('gulp-gitshasuffix', err));
				return callback();
			}
			sha = latestSha;
			appendSuffix();
		});
	};

	function saveManifestFile (manifestPath, data, callback) {
		if (manifestPath) {
			try {
				fs.statSync(manifestPath);
			} catch (error) {
				fs.writeFileSync(manifestPath, '');
			}
			var readedJson;
			try {
				readedJson = fs.readFileSync(manifestPath, 'utf8');
			} catch (error) {
			}
			if (readedJson) {
				readedJson = JSON.parse(readedJson);
				data = JSON.parse(data);
				Object.assign(readedJson, data);
				readedJson = JSON.stringify(readedJson);
				return fs.writeFileSync(manifestPath, readedJson, callback);
			} else {
				return fs.writeFileSync(manifestPath, data, callback);
			}
		} else {
			callback();
		}
	}

	return through.obj(gitshasuffix, function (callback) {
		sha = null;
		if (options.manifest) {
			return saveManifestFile(manifest, JSON.stringify(manifestData), callback);
		} else {
			return callback();
		}
	});
};
