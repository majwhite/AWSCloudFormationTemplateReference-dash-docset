const fs = require('fs-extra');
const cheerio = require('cheerio');
const path = require('path');
const debug = require('debug')('fixBrokenLinks');

const fixBrokenLinksInHTML = ($, selector, attr, rootDocuments, docRoot) => {
    let elems = $(selector);
    elems.each((i, el) =>
    {
        let path = $(el).attr(attr);
        if (typeof path !== 'undefined') {
            let internalAnchorTestSplitPath = path.split('#')[0];
            if (internalAnchorTestSplitPath.length > 0) {                   // If this is not just an internal anchor
                if (path.startsWith('./')) {                                // If the link is a ./ relative link
                    return                                                  // Then do nothing as this is already a link to a document within the docroot
                }

                if (path.startsWith(docRoot)) {                             // If a link is a absolute link that is within the docroot
                    let splitPathByDocRoot = path.split(docRoot + '/')[1];
                    if (rootDocuments.includes(splitPathByDocRoot)) {       // And it links to a page which is part of the rootDocuments
                        $(el).attr(attr, `${splitPathByDocRoot}`);          // Update the attribute to make it a relative path
                    }
                    return
                }

                if (!internalAnchorTestSplitPath.startsWith('http')                 // It is not currently an absolute path
                    && !rootDocuments.includes(internalAnchorTestSplitPath)) {      // And it is NOT in our list of local paths
                    $(el).attr(attr, `${docRoot}/${path}`)                          // Update the attribute to make it an absolute path)
                    return
                }
            }
        }
    });
    
    return $;
}

const fixBrokenLinksInFile = (documentDir, fileName, rootDocuments, docRoot) => {
    debug(`Fixing broken links in ${fileName}`);
    let file = path.join(documentDir, fileName)
    return fs.readFile(file, 'utf-8')
        .then(cheerio.load)
        .then($ => {
            $ = fixBrokenLinksInHTML($, 'a', 'href', rootDocuments, docRoot);
            $ = fixBrokenLinksInHTML($, 'img', 'src', rootDocuments, docRoot);

            $('#main-col-footer').remove();

            let newContent = $.html();
            return fs.writeFile(file, newContent);
            
        });
}


const fixBrokenLinks = (docRoot, documentsDir, paths) => {
    return Promise.all(paths.map(path => {
        fixBrokenLinksInFile(documentsDir, path, paths, docRoot)
    }));
}

module.exports = fixBrokenLinks