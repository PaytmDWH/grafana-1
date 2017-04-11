///<reference path="../../../headers/common.d.ts" />

import _ from 'lodash';
import moment from 'moment';
import kbn from 'app/core/utils/kbn';

export class TableRenderer {
  formaters: any[];
  colorState: any;

  constructor(private panel, private table, private timezone) {
    this.formaters = [];
    this.colorState = {};
  }

  getColorForValue(value, style) {
    if (!style.thresholds) { return null; }

    for (var i = style.thresholds.length - 1; i >= 0 ; i--) {
      if (value >= style.thresholds[i]) {
        return style.colors[i];
      }
    }
    return null;
  }

  defaultCellFormater(v) {
    if (v === null || v === void 0) {
      return '';
    }

    if (_.isArray(v)) {
      v = v.join(',&nbsp;');
    }

    return v;
  }


  createColumnFormater(style) {
    if (!style) {
      return this.defaultCellFormater;
    }

    if (style.type === 'date') {
      return v => {
        if (_.isArray(v)) { v = v[0]; }
        var date = moment(v);
        /*if (this.timezone === 'utc') {
          date = date.utc();
        }*/
        date = date.utc();
        var stringDate = date.toString();
        stringDate = stringDate.substring(-1,stringDate.length-5) + "+0530";
        var nd = moment.parseZone(stringDate);
        return nd.format(style.dateFormat);
      };
    }

    if (style.type === 'number') {
      let valueFormater = kbn.valueFormats[style.unit];

      return v =>  {
        if (v === null || v === void 0) {
          return '-';
        }

        if (_.isString(v)) {
          return v;
        }

        if (style.colorMode) {
          this.colorState[style.colorMode] = this.getColorForValue(v, style);
        }

        return valueFormater(v, style.decimals, null);
      };
    }

    return this.defaultCellFormater;
  }

  formatColumnValue(colIndex, value) {
    if (this.formaters[colIndex]) {
      return this.formaters[colIndex](value);
    }

    for (let i = 0; i < this.panel.styles.length; i++) {
      let style = this.panel.styles[i];
      let column = this.table.columns[colIndex];
      var regex = kbn.stringToJsRegex(style.pattern);
      if (column.text.match(regex)) {
        this.formaters[colIndex] = this.createColumnFormater(style);
        return this.formaters[colIndex](value);
      }
    }

    this.formaters[colIndex] = this.defaultCellFormater;
    return this.formaters[colIndex](value);
  }

  renderCell(columnIndex, value, addWidthHack = false) {
    if (typeof value !="undefined") {
       if  ((value.toString().split("|").length >1) && (this.table.columns[0].text!= "JSON")) {
          var temp_val_1= this.formatColumnValue(columnIndex, Number(value.toString().split("|")[0]))
          let valueFormater = kbn.valueFormats["deviationpercent"]
          var deviationdecimals=0
          for (let i = 0; i < this.panel.styles.length; i++) {
            let style = this.panel.styles[i];
            let column = this.table.columns[columnIndex];
            var regex = kbn.stringToJsRegex(style.pattern);
            if (column.text.match(regex)) {
                deviationdecimals=style.deviationdecimals
                break
            }          
          }
          var temp_val_2=valueFormater(Number(value.toString().split("|")[1]), deviationdecimals, null);
          value= '<span style="float:left;color:black">' + temp_val_1+'</span>' 
         + '<span style="float:right">' + temp_val_2+'</span>'
        }
       else {
          value = this.formatColumnValue(columnIndex, value);
        }
    }
    else{
    value = this.formatColumnValue(columnIndex, value);
    }
    var style = '';
    if (this.colorState.cell) {
      style = ' style="background-color:' + this.colorState.cell + ';color: white"';
      this.colorState.cell = null;
    } else if (this.colorState.value) {
      style = ' style="color:' + this.colorState.value + '"';
      this.colorState.value = null;
    }

    // because of the fixed table headers css only solution
    // there is an issue if header cell is wider the cell
    // this hack adds header content to cell (not visible)
    var widthHack = '';
    if (addWidthHack) {
      widthHack = '<div class="table-panel-width-hack">' + this.table.columns[columnIndex].text + '</div>';
    }

    return '<td' + style + '>' + value + widthHack + '</td>';
  }

  render(page) {
    let pageSize = this.panel.pageSize || 100;
    let startPos = page * pageSize;
    let endPos = Math.min(startPos + pageSize, this.table.rows.length);
    var html = "";

    for (var y = startPos; y < endPos; y++) {
      let row = this.table.rows[y];
      let cellHtml = '';
      let rowStyle = '';
      for (var i = 0; i < this.table.columns.length; i++) {
        cellHtml += this.renderCell(i, row[i], y === startPos);
      }

      if (this.colorState.row) {
        rowStyle = ' style="background-color:' + this.colorState.row + ';color: white"';
        this.colorState.row = null;
      }

      html += '<tr ' + rowStyle + '>' + cellHtml + '</tr>';
    }

    return html;
  }
}
