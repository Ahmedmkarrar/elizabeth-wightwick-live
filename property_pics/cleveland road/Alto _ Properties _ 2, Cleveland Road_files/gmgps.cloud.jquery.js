jQuery.fn.replaceHtml = function (html) {
    var o = $(this[0]);
    o.find('*').remove();
    o.html(html);
    return o;
};
