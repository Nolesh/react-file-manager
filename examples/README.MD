# Examples

Below are links to **Codesandbox** instances for examples of how to use this repo. Feel free to fork these sandboxes and play around with this library's features. If you have any examples of cool uses of this library, submit a PR to add one!

## Minimal

Simple file uploader with minimal parameters.

[Example Codesandbox](https://codesandbox.io/s/react-file-manager-minimal-rtw286)

## Basic Usage

Basic functionality of the file manager, included fetching remote files, uploading, downloading, viewing and deleting files.

[Example Codesandbox](https://codesandbox.io/s/react-file-manager-basic-x5x4eq)

## Overridden UI

Using `overrides` property, you can override the appearance of the container (root) and file element. It is also possible to change/localize all texts and errors.

[Example Codesandbox](https://codesandbox.io/s/react-file-manager-overridden-ui-808dzl)

## Custom UI

It is possible to completely replace the container (root) and file item components by using `overrides` property. The following example demonstrates how to replace the default components with components created using the Material UI Library.

[Example Codesandbox](https://codesandbox.io/s/react-file-manager-custom-ui-px4qjx)

## Previews

An example of overriding the file preview function. Using `filePreview` property, you can create thumbnails for unsupported files such as `PDF`. In this example, we are adding a thumbnail for `PDF` files and using custom audio & video thumbnails.

[Example Codesandbox](https://codesandbox.io/s/react-file-manager-previews-ih89p5)

## Programmatically Scrolling

The following example demonstrates the ability to programmatically scroll to a file element after being interacted with it. With the `getRoot` property, you can get a DOM reference to the root body element and use it to scroll up or down.

[Example Codesandbox](https://codesandbox.io/s/react-file-manager-scrolling-v4cits)

## File Validation

By providing `fileValidator` property, you can specify custom validation for files.
The value must be a function that accepts File object and returns `null` if file should be accepted or `error object` / `array of error objects` if file should be rejected.

[Example Codesandbox](https://codesandbox.io/s/react-file-manager-file-validation-bb7u41)

## Exposed Functions

The following example shows how exposed functions such as `openFileDialog`, `addLocalFiles`, `upload`, `cancelUpload`, and others can be used.

[Example Codesandbox](https://codesandbox.io/s/react-file-manager-exposed-funcs-rdl5f6)

## Advanced uploading

This example demonstrates various upload settings and the ability to rename files.

[Example Codesandbox](https://codesandbox.io/s/react-file-manager-advanced-uploading-ceq8tl)
