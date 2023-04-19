declare function reload(this: any, options: any): {
    exportmap: {
        make: (plugin_require: any) => (path: string) => any;
    };
};
declare namespace reload {
    var defaults: {
        active: boolean;
        log: {
            watchfile: boolean;
        };
    };
}
export default reload;
