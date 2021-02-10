import {Component, ViewChild} from '@angular/core';
import * as XLSX from 'xlsx';
import {MatTableDataSource} from "@angular/material/table";
import {MatSort} from "@angular/material/sort";

interface TableData {
  count: number;
  pairing: string;
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Common Pairings Finder';
  arrayBuffer: any;
  fileList: any[] = [];

  // Used to determine which column index in the excel spreadsheet we care about
  col1 = 2;
  col2 = 6;

  // Associated Header names for the columns indexed above
  header1 = '';
  header2 = '';

  mode = '';
  haveFoundCommonPairings = false;

  MINIMUM_COUNT = 3;

  // Used for creating table
  displayedColumns: string[] = ['pairing', 'count'];
  dataSource: MatTableDataSource<any> = new MatTableDataSource<any>();
  @ViewChild(MatSort, { static: true }) sort: MatSort = new MatSort();

  constructor() {
  }

  findModeFromXlsxFile(e: any): void {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.arrayBuffer = reader.result;
      const data = new Uint8Array(this.arrayBuffer);
      const arr = [];
      for (let i = 0; i !== data.length; ++i) {
        arr[i] = String.fromCharCode(data[i]);
      }
      const bstr = arr.join('');
      const workbook = XLSX.read(bstr, {type: 'binary'});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      this.fileList = XLSX.utils.sheet_to_json(worksheet, {raw: true});
      console.log(this.fileList);
      this.setHeaderNames(this.fileList);
      this.findMode(this.fileList);
    };
  }

  findMode(data: any): void {
    this.haveFoundCommonPairings = false;
    const combos: string[] = [];
    let startIdx = 0;
    let endIdx = 1;
    while (endIdx < data.length) {
      // Determine the number of items in the order. Group that set.
      while (data[startIdx][this.header1] === data[endIdx][this.header1]) {
        endIdx++;
      }

      // Only count orders with more than one item purchased
      if (endIdx - startIdx > 1) {
        // Store each permutation in the combos array
        for (let i = startIdx; i < endIdx; i++) {
          for (let j = startIdx + 1; j < endIdx; j++) {
            combos.push([data[i][this.header2], data[j][this.header2]].sort().join(' '));
          }
        }
      }

      // Reset indices to solve for the next order
      startIdx = endIdx;
      endIdx++;
    }

    console.log('COMBOS: ', combos);

    let maxCount = 0;
    let maxOrder = '';
    let secondMaxCount = 0;
    let secondMaxOrder = '';

    // Count each occurrence
    const counts: any = {};
    combos.forEach((combo, i) => {
      // Add to counter
      if (!counts[combo]) {
        counts[combo] = 1;
      } else {
        counts[combo]++;
      }

      // Store highest and second-highest occurrences
      if (combo === maxOrder) {
        maxCount = counts[combo];
      } else if (counts[combo] >= maxCount) {
        secondMaxCount = maxCount;
        secondMaxOrder = maxOrder;
        maxCount = counts[combo];
        maxOrder = combo;
      } else if (counts[combo] > secondMaxCount) {
        secondMaxCount = counts[combo];
        secondMaxOrder = combo;
      }
    });

    this.mode = `HIGHEST: ${ maxOrder } occurred ${ maxCount } times. SECOND HIGHEST: ${ secondMaxOrder } occurred ${ secondMaxCount } times.`;
    this.haveFoundCommonPairings = true;
    this.buildTable(counts);
  }

  buildTable(counts: any): void {
    const tableData: TableData[] = [];
    Object.keys(counts).forEach(key => {
      if (counts[key] > this.MINIMUM_COUNT) {
        tableData.push({ pairing: key, count: counts[key] });
      }
    });
    console.log(tableData);
    const sorted = tableData.sort((a: TableData, b: TableData) => {
      if (a.count > b.count) {
        return -1;
      } else if (a.count < b.count) {
        return 1;
      } else {
        return 0;
      }
    });
    this.dataSource = new MatTableDataSource<TableData>(sorted);
    this.dataSource.sort = this.sort;
  }

  setHeaderNames(data: any): void {
    this.col1 = Number(this.col1);
    this.col2 = Number(this.col2);
    Object.keys(data[0]).forEach((header, i) => {
      if (i === this.col1) {
        this.header1 = header;
      } else if (i === this.col2) {
        this.header2 = header;
      }
    });
    console.log('HEADER 1: ', this.header1);
    console.log('HEADER 2: ', this.header2);
  }
}
