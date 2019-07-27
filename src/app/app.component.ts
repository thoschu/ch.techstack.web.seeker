declare let gapi: any;

import {AfterViewInit, Component, ElementRef, OnInit, OnDestroy, ViewChild} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {Router} from '@angular/router';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {fromEvent, Observable, Subject, from} from 'rxjs';
import {debounceTime, map, tap, switchMap, mergeMap, distinctUntilChanged} from 'rxjs/operators';
import QRCode from 'qrcode';
import feather from 'feather-icons';

// Object-Literal-Schreibweise
const config = {
  _id: null,
  set id(newId) {
    if (typeof newId === 'number') {
      this._id = newId;
    } else {
      throw new TypeError('id has to be a number');
    }
  },
  get id() {
    return this._id;
  }
};

// Konstruktorfunction
function Config(id, name) {
  this.id = id;
  this._name = name;
}

Config.prototype = {
  set id(newId) {
    this._id = newId;
  },
  get id() {
    return this._id;
  }
};

const textProperties = {
  id: {
    writable: true,
    enumerable: true,
    configurable: true,
    value: new Config(77, 'Tom S.').id
  },
  _text: { // 'value property'
    writable: true,
    enumerable: false,
    configurable: false,
    value: ''
  },
  text: { // 'accessor property'
    enumerable: true,
    configurable: false,
    get: function() {
      return this._text;
    },
    set: function(text) {
      this._text = text;
    }
  },
  sanitize: {
    enumerable: true,
    configurable: false,
    value: function() {
      return this.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy, OnInit {
  title = 'seeker';
  @ViewChild('cleanBtn') cleanBtn;
  cleanBtnIcon;
  @ViewChild('skind') skind;
  selection;
  searchSubject$;
  results$: Observable<any>;
  gifsUrl;
  imagesUrl;
  copiedText;

  constructor(private httpClient: HttpClient, private sanitizer: DomSanitizer, private router: Router) {
    this.searchSubject$ = new Subject<string>();
    // console.log(feather);
  }

  ngOnInit() {
    this.selection = this.skind.nativeElement.value;

    this.cleanBtnIcon = this.sanitizer.bypassSecurityTrustHtml(feather['icons']['trash-2'].toSvg({
      width: 16,
      height: 16,
      'stroke-width': 1,
      color: 'black'
    }));

    fromEvent(this.cleanBtn.nativeElement, 'click').subscribe(x => {
      console.log(x);
    });

    fromEvent(this.skind.nativeElement, 'click').subscribe(x => {
      this.selection = x['target'].value;
      this.results$ = this.getSearchSubject();
    });

    this.results$ = this.getSearchSubject();
  }

  ngOnDestroy() {
    this.searchSubject$.unsubscribe();
  }

  getSearchSubject() {
    return this.searchSubject$
      .pipe(debounceTime(500))
      .pipe(distinctUntilChanged())
      .pipe(tap(x => console.log))
      .pipe(switchMap(searchString => this.queryAPI(searchString)));
  }

  inputChanged($event) {
    this.searchSubject$.next($event);
  }

  cleanInput(value) {
    return value = '';
  }

  queryAPI(searchString) {
    const apiKey = 'NrwK6NIQfZVQibHkR6l6ur8ILMbvzKvM';
    const limit = '50';
    const offset = '0';
    const rating = 'Y';
    const lang = 'en';
    const head = '//api.giphy.com/v1/gifs/search?api_key=';
    const tail = `&limit=${limit}&offset=${offset}&rating=${rating}&lang=${lang}`;
    this.gifsUrl = `${head}${apiKey}&q=${this.sanitize(searchString)}${tail}`;
    this.imagesUrl = `https://www.reddit.com/r/all/search.json?q=${this.sanitize(searchString)}`;

    let client;

    switch (this.selection) {
      case 'images':
        client = this.httpClient.get(this.imagesUrl)
          .pipe(map(result => result['data']['children']));
        break;
      case 'gifs':
        client = this.httpClient.get(this.gifsUrl)
          .pipe(map(result => result['data']));
          // .pipe(mergeMap(result => from(result)))
        break;
      case 'videos':
        break;
      default:
        console.log('Sorry');
        throw new TypeError('Images not allowed yet!!!');
    }

    return client;
  }

  sanitize(text) {
    const txtItem = Object.create(Object.prototype, textProperties);
    console.log(Object.getOwnPropertyDescriptor(txtItem, '_text'));
    Object.defineProperty(txtItem, 'test', {
      value: 13,
      enumerable: true
    });
    console.log(txtItem.test);
    console.log(Object.keys(txtItem));
    console.log(Object.values(txtItem));
    delete txtItem.test;
    console.log(txtItem.test);
    console.log(Object.keys(txtItem));
    console.log(Object.entries(txtItem));
    console.log(Object.keys(txtItem));
    txtItem.text = text;
    return txtItem.sanitize();
  }

  copySrc($event) {
    navigator['clipboard'].writeText($event.srcElement.src).then(() => {
      // console.log('Copying to clipboard was successful! ', $event.srcElement.src);
      this.copiedText = $event.srcElement.src;
      window.location.href = '#modal1';
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  }

  getQr() {
    QRCode['toCanvas'](document.getElementById('qrcanvas'), JSON.stringify({
      images: this.imagesUrl,
      gifs: this.gifsUrl,
      videos: null
    }), error => {
      if (error) {
        throw new Error(error);
      }
    });
  }
}
