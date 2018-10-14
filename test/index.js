const test = require('tape');
const path = require('path');
const { resolve } = require('../src');

// Just in case it's called from a different directory
process.chdir(__dirname);

function relativeToTestDir(filepath) {
    return path.resolve(__dirname, filepath.indexOf('/') === 0 ? `.${filepath}` : filepath);
}

function expectResolvedTo(file) {
    if (!file) return { found: false };

    return {
        found: true,
        path: relativeToTestDir(file)
    };
}

test('Resolves files required from a file in the top directory', (t) => {
    const actual = resolve('@/file', __filename, {});
    const expected = expectResolvedTo('modules/file.js');

    t.deepEqual(actual, expected);
    t.end();
});

test('Resolves files required from a file deeper in the tree', (t) => {
    const result = resolve('@/file', relativeToTestDir('./some/other/file.js'), {});
    const expected = expectResolvedTo('modules/file.js');

    t.deepEqual(result, expected);
    t.end();
});

test('Supports passing aliases directly through eslint import/resolver settings', (t) => {
    t.deepEqual(
        resolve('#/file', __filename, [
            { rootPathPrefix: '@', rootPathSuffix: 'modules' },
            { rootPathPrefix: '#', rootPathSuffix: 'modules/anotherpath' },
        ]),
        expectResolvedTo('modules/anotherpath/file.js'),
        'Array of objects w/ rootPathPrefix and rootPathSuffix'
    );

    t.deepEqual(
        resolve('~/file', __filename, {
            rootPathSuffix: 'modules/anotherpath'
        }),
        expectResolvedTo('modules/anotherpath/file.js'),
        'Object, only suffix specified'
    );

    t.deepEqual(
        resolve('!/modules/file', __filename, {
            rootPathPrefix: '!'
        }),
        expectResolvedTo('modules/file.js'),
        'Object, only prefix specified'
    );

    t.end();
});

test('Correctly resolves default prefix (~/) when no configuration provided', (t) => {
    const result = resolve('~/modules/file', relativeToTestDir('./some/other/file.js'), {}, '.babelrcNoConf');
    const result2 = resolve('~/modules/file', relativeToTestDir('./some/other/file.js'), {}, '.babelrcNoConfArray');
    const expected = expectResolvedTo('modules/file.js');

    t.deepEqual(result, expected, 'When plugin listed as a string');
    t.deepEqual(result2, expected, 'When plugin listed in array form with no config');
    t.end();
});

test('Supports multiple prefixes', (t) => {
    const prefix1 = resolve('@/file', __filename, {}, '.babelrcArray');
    const expected1 = expectResolvedTo('modules/file.js');

    t.deepEqual(prefix1, expected1);

    const prefix2 = resolve('_/file', __filename, {}, '.babelrcArray');
    const expected2 = expectResolvedTo('modules/anotherpath/file.js');

    t.deepEqual(prefix2, expected2);
    t.end();
});

test('Can find plugin configuration by a shorthand (root-import) in babel config', (t) => {
    const resolved = resolve('@/file', __filename, {}, '.babelrcShorthand');
    const expected = expectResolvedTo('modules/anotherpath/file.js');

    t.deepEqual(resolved, expected);
    t.end();
});

test('Can read configuration from package.json when no .babelrc found', (t) => {
    const actual = resolve('@/file', __filename, {}, '.babelrcNonexistent');
    const expected = expectResolvedTo('modules/file.js');

    t.deepEqual(actual, expected);
    t.end();
});

test('Skips package.json with no "babel" hash in it', (t) => {
    const oldCwd = process.cwd();
    const fromFile = relativeToTestDir('lookup/submodule/lib/path.js');

    process.chdir(relativeToTestDir('lookup/submodule/lib/'));

    const actual = resolve('@/file', fromFile, {});
    const expected = expectResolvedTo('modules/file.js');

    process.chdir(oldCwd);

    t.deepEqual(actual, expected);
    t.end();
});

test('Should send extra configuration to node resolver', (t) => {
    const expected = { found: true, path: relativeToTestDir('modules/component.jsx') };
    const actual = resolve('@/component', __filename, {
        extensions: ['.jsx'],
        rootPathSuffix: 'modules',
        rootPathPrefix: '@'
    });

    t.deepEqual(actual, expected);
    t.end();
});

test('Does nothing when babel plugin not listed in .babelrc', (t) => {
    const result = resolve('~/modules/file', __filename, {}, '.babelrcNotListed');
    const expected = expectResolvedTo(false);

    t.deepEqual(result, expected);
    t.end();
});

test('Should resolve relative paths in the same directory', (t) => {
    const oldCwd = process.cwd();
    const fromFile = relativeToTestDir('lookup/submodule/lib/path.js');

    process.chdir(relativeToTestDir('lookup/submodule/lib/'));

    const actual = resolve('./other.js', fromFile, {});
    const expected = expectResolvedTo('lookup/submodule/lib/other.js');

    process.chdir(oldCwd);

    t.deepEqual(actual, expected);
    t.end();
});

test('Should resolve relative paths in the parent directory', (t) => {
    const oldCwd = process.cwd();
    const fromFile = relativeToTestDir('lookup/submodule/lib/path.js');

    process.chdir(relativeToTestDir('lookup/submodule/lib/'));

    const actual = resolve('../package.json', fromFile, {});
    const expected = expectResolvedTo('lookup/submodule/package.json');

    process.chdir(oldCwd);

    t.deepEqual(actual, expected);
    t.end();
});

test('Should resolve external dependencies', (t) => {
    const oldCwd = process.cwd();
    const fromFile = relativeToTestDir('lookup/submodule/lib/path.js');

    process.chdir(relativeToTestDir('lookup/submodule/lib/'));

    const actual = resolve('lodash', fromFile, {});
    const expected = expectResolvedTo('../node_modules/lodash/lodash.js');

    process.chdir(oldCwd);

    t.deepEqual(actual, expected);
    t.end();
});

test('Should resolve builtin core modules', (t) => {
    const oldCwd = process.cwd();
    const fromFile = relativeToTestDir('lookup/submodule/lib/path.js');

    process.chdir(relativeToTestDir('lookup/submodule/lib/'));

    const actual = resolve('path', fromFile, {});
    const expected = { found: true, path: null };

    process.chdir(oldCwd);

    t.deepEqual(actual, expected);
    t.end();
});

test('Should not resolve file that doesn\'t exists', (t) => {
    const prefix1 = resolve('@/nonexistent', __filename, {});
    const expected1 = expectResolvedTo(false);

    t.deepEqual(prefix1, expected1);
    t.end();
});

test('Can resolve different types of modules', (t) => {
    const result1 = resolve('@/path/to/moduleA', __filename, {});
    const expected1 = expectResolvedTo('modules/path/to/moduleA.js');
    t.deepEqual(result1, expected1, 'Single file');

    const result2 = resolve('@/path/to/moduleB', __filename, {});
    const expected2 = expectResolvedTo('modules/path/to/moduleB/index.js');
    t.deepEqual(result2, expected2, 'index.js inside a directory');

    const result3 = resolve('@/path/to/moduleC', __filename, {});
    const expected3 = expectResolvedTo('modules/path/to/moduleC/lib/main.js');
    t.deepEqual(result3, expected3, 'Main file specified in package.json inside a directory');

    t.end();
});
