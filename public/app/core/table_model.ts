
export default class TableModel {
  columns: any[];
  rows: any[];
  type: string;

  constructor() {
    this.columns = [];
    this.rows = [];
    this.type = 'table';
  }

  sort(options) {
    if (options.col === null || this.columns.length <= options.col) {
      return;
    }

    this.rows.sort(function(a, b) {
      a = a[options.col];
      b = b[options.col];
      if (options.dev===undefined || options.dev===false) 
      {
        var devindex=0;
      }
      else
      {
      var devindex=1
      }

      if (a === undefined) {
        return -1;
      }
      if (b === undefined) {
        return 1;
      }

      if (  a.toString().indexOf('|') >-1  )
      {
        a = Number(a.split('|')[devindex])
        b= Number(b.split('|')[devindex])

        if( isNaN(a) || a === undefined)
        {
          return -1;
        }

        if( isNaN(b) || b === undefined)
        {
          return -1;
        }
      }

      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });

    this.columns[options.col].sort = true;

    if (options.desc) {
      this.rows.reverse();
      this.columns[options.col].desc = true;
    }
  }
}
