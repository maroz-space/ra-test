'use strict';

document.addEventListener("DOMContentLoaded", () => {

    const MODAL = new Vue({
        name: 'Модальное окно',
        el: '#modal',
        data: function() {
            return {
                param: {
                    head: '',
                    body: '',
                    class: '',
                    button: [{}],
                },
                view: false,
                show: '',
                display: 'none'
            }
        },
        watch: {
            view: function(n, e) {
                if (n && e) return false;
                if (this.view) {
                    this.display = 'block';
                    setTimeout(() => { this.show = 'show'}, 123);
                } else {
                    this.show = '';
                    setTimeout(() => { this.display = 'none'}, 123);
                }
            }
        },
        methods: {
            toggle: function(type = true) {
                this.view = type;
            }
        },
        template: `
            <div>
                <div
                    id="modal"
                    class="modal fade"
                    :class="{'show': show}"
                    :style="'display:' + display"
                    data-bs-backdrop="static"
                    data-bs-keyboard="false"
                    tabindex="-1"
                >
                    <div v-if="view == 'loader'" class="w-100 h-100 d-flex justify-content-center d-flex align-items-center">
                        <div class="spinner-border text-dark" role="status" style="width: 5rem; height: 5rem;"></div>
                    </div>

                    <div v-if="view == true" class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h1 :class="param.class" class="modal-title fs-4">{{ param.head }}</h1>
                            </div>
                            <div :class="param.class" class="modal-body">{{ param.body }}</div>
                            <div v-if="param.button" class="modal-footer">
                                <button
                                    v-for="b in param.button"
                                    @click="b.action ? b.action() : view = false"
                                    :class="b.class || 'btn-primary'"
                                    class="btn"
                                    type="button"
                                >{{ b.title || 'ОК' }}</button>
                            </div>
                        </div>
                    </div>

                </div>
                <div
                    v-if="display == 'block'"
                    :class="{'show': show}"
                    class="modal-backdrop bg-opacity-25 fade"
                />
            </div>
        `
    });


    const DOC = new Vue({
        name: 'Список документов',
        el: '#app',
        data: function() {
            return {
                init: false,
                query_status: {
                    run: false,
                    exile: false,
                    queue: false,
                    code: false,
                    error: '',
                    counter: 0,
                },
                scroll: 0,
                list: {},
                pagination: {
                    current: 0,
                    total: 0,
                    view: 0,
                    view_arr: []
                },
                form: false,
                form_doc: {},
                exit: false
            }
        },
        mounted: function() {
            document.documentElement.scrollTop = 0;
            this.getList();
        },
        methods: {
            scrollTop: function() {
                document.documentElement.scrollTop = 0;
            },
            queryStatus: function(code = 0, error = '') {
                this.query_status.code = code;
                this.query_status.error = error;
                this.query_status.counter++;
            },
            queryController: function(control = new AbortController()) {
                if (this.query.exile) {
                    this.query.exile.abort();
                    this.query_status.run = false;
                }
                this.query.exile = control;
                clearTimeout(this.query.queue);
                this.query.queue = false;
            },
            query: function(param, callback, controller = false) {
                //  ~~~
                let data = new FormData();
                for (let i in param) data.append(i, param[i]);
                let option = { method: 'POST', body: data };
                if (controller) option.signal = controller;
                //  ~~~
                return fetch('/api.php', option).then(
                    res => {
                        if (res.status == 200) {
                            res.json().then(
                                res => {
                                    if (!(res instanceof Object)) res = {};
                                    if (!('status' in res) || !('status_msg' in res)) {
                                        res.status = 1000;
                                        res.status_msg = 'Неудалось получить данные (struct)';
                                    }
                                    //  ~~~
                                    res['data'] = res['data'] || {};
                                    //  ~~~
                                    this.queryStatus(res.status, res.status_msg);
                                    callback(res.data);
                                },
                                () => {
                                    this.queryStatus(1000, 'Неудалось получить данные (json)');
                                    callback({});
                                }
                            );                    
                        }
                        else {
                            this.queryStatus(1000, res.status + ' : ' + res.statusText);
                            callback({});                    
                        }
                    },
                    () => {
                        if (this.exit) return false;
                        if ('signal' in option) return false;
                        this.queryStatus(1000, 'Сервер недоступен');
                        callback({});
                    }
                );
            },
            queryRun: function(param, callback = null) {
                this.queryController();
                this.query_status.run = true;
                MODAL.toggle('loader');
                this.query.queue = setTimeout(() => {
                    this.query(param , e => {
                        this.queryController(false);
                        if (!this.checkError(e)) {
                            if (!this.init && !this.query_status.error) this.init = true;
                            this.list = e.list || [];
                            for (let i in e.pagination) {
                                if (['current', 'view'].includes(i)) {
                                    if (this.pagination[i] != e.pagination[i]) {
                                        Vue.nextTick().then(() => document.documentElement.scrollTop = 0);
                                    }
                                }
                                this.pagination[i] = e.pagination[i];
                            }
                            MODAL.toggle(false);
                            if (callback) callback();
                        }
                        this.query_status.run = false;
                    }, this.query.exile.signal);
                }, this.init ? 444 : 888);
            },
            checkError: function(e) {
                if (this.init && this.query_status.error) {
                    MODAL.param = {
                        head: 'Ошибка',
                        body: this.query_status.error,
                        class: 'text-danger',
                        button: [{class: 'btn-danger'}]
                    };
                    MODAL.toggle();
                } else {
                    MODAL.toggle(false);
                }
                return !!this.query_status.error;
            },
            openForm: function(doc = {}) {
                this.form_doc = doc;
                this.scroll = document.documentElement.scrollTop;
                this.form = true;
            },
            closeForm: function(scroll = this.scroll) {
                if (this.form_doc.id) scroll = this.scroll;
                Vue.nextTick().then(() => document.documentElement.scrollTop = scroll);
                this.form_doc = {};
                this.form = false;
            },
            getList: function() {
                this.queryRun({
                    action: 'list',
                    data: JSON.stringify({
                        pagination: this.pagination
                    })
                });
            },
            checkSaveData: function(data) {
                if (!data.form_doc.number) return 'Не указан номер документа';
                if (!data.form_doc.date) return 'Не указана дата документа';
                if (data.form_doc.date < '2000-01-01') return 'Дата указана некорректно';
                if (data.form_doc.date > '2100-01-01') return 'Дата указана некорректно';
                if (Object.keys(data.dublicate).length) return 'В списке спецификаций присутствуют дубликаты';
                for (let d of data.form_doc.detail) {
                    if (!d.name) return 'Не заполнено наименование спецификации';
                    if (d.price == '') return 'Не указана сумма для спецификации';
                }
                return false;
            },
            saveDoc: function(data) {
                let error = this.checkSaveData(data);
                if (error) {
                    MODAL.param = {
                        head: 'Ошибка',
                        body: error,
                        class: 'text-danger',
                        button: [{class: 'btn-danger'}]
                    };
                    MODAL.toggle();
                    return false;
                }
                let pagination = JSON.parse(JSON.stringify(this.pagination));
                if (!data.form_doc.id) pagination.current = 1;
                this.queryRun({
                    action: 'save',
                    data: JSON.stringify({
                        doc: data.form_doc,
                        pagination: pagination,
                        list: true
                    })
                }, () => {
                    this.closeForm(0);
                });
            },
            deleteDoc: function(doc) {
                MODAL.param = {
                    head: 'Подтверждение',
                    body: `
                        Удалить документ ${doc.number} от 
                        ${doc.date.split('-').reverse().join('.')} ?
                    `,
                    class: '',
                    button: [{
                        title: 'Удалить',
                        class: 'btn-danger',
                        action: () => {
                            this.queryRun({
                                action: 'delete',
                                data: JSON.stringify({
                                    id: doc.id,
                                    list: true,
                                    pagination: this.pagination
                                })
                            });
                        }
                    },{
                        title: 'Отмена',
                        class: 'btn-secondary'
                    }]
                };
                MODAL.toggle();
            }
        },
        template: `
            <div class="container py-4 mb-3">

                <template v-if="init">
                    <c-form
                        v-if="form"
                        @save="saveDoc($event)"
                        @close="closeForm()"
                        :doc="form_doc"
                    />
                    <template v-else>
                        <h1>Список документов</h1>
                        <div class="mt-4 d-flex flex-wrap justify-content-between">
                            <div>
                                <button @click="openForm()" type="button" class="btn btn-primary me-3 mb-4">
                                    <i class="fa fa-plus-circle me-2" />Добавить
                                </button>
                                <button @click="getList()" type="button" class="btn btn-outline-primary me-3 mb-4">
                                    <i class="fa fa-refresh me-2" />Обновить
                                </button>
                            </div>
                            <c-pagination
                                :data="pagination"
                                class="mb-4"
                            />
                        </div>
                        <c-document
                            v-for="doc in list"
                            :doc="doc"
                            :key="doc.id"
                            @open="openForm($event)"
                            @delete="deleteDoc($event)"
                        />
                        <div v-if="list.length > 5" class="d-flex flex-wrap justify-content-between">
                            <button @click="scrollTop()" type="button" class="btn btn-primary me-3 mb-4">
                                <i class="fa fa-arrow-circle-up" />
                            </button>
                            <c-pagination
                                :data="pagination"
                                :view_to="false"
                                class="mb-4"
                            />
                        </div>
                        <div v-if="!list.length" class="alert alert-success">
                            Документы отсутствуют
                        </div>
                    </template>
                </template>

                <template v-else>
                    <c-error-panel :data="query_status" class="mt-4" />
                </template>
                
            </div>
        `
    });


    window.addEventListener('beforeunload', function() {
        DOC.exit = true;
    });

});


Vue.component('c-pagination', {
    props: ['data', 'view_to'],
    template: `
        <div class="d-flex" style="max-width: fit-content">
            <div v-if="data.total > 1" :class="{'me-3': view_to !== false}" class="btn-group">
                <template v-if="data.total > 6">
                    <button 
                        @click="data.current--; $root.getList()"
                        :class="data.current == 1 ? 'disabled btn-secondary': 'btn-primary'"
                        class="btn"
                    ><i class="fa fa-arrow-left" /></button>
                    <div class="input-group">
                        <label class="input-group-text rounded-0 border border-primary" for="pagination_page">
                            <i class="fa fa-file-text-o" />
                        </label>
                        <select
                            @change="data.current = parseInt($event.target.value); $root.getList()"
                            class="form-select border border-primary rounded-0"
                            id="pagination_page"
                        >
                            <option 
                                v-for="p in data.total"
                                :value="p"
                                :selected="data.current == p ? 'selected' : ''"
                            >{{ p }}</option>
                        </select>
                    </div>
                    <button
                        @click="data.current++; $root.getList()"
                        :class="data.current == data.total ? 'disabled btn-secondary': 'btn-primary'"
                        class="btn"
                    ><i class="fa fa-arrow-right" /></button>
                </template>
                <template v-else>
                    <button
                        v-for="p in data.total"
                        @click="data.current = p; $root.getList()"
                        :class="{'active': data.current == p}"
                        class="btn btn-outline-primary"
                        type="button"
                    >{{ p }}</button>
                </template>
            </div>
            <div v-if="data.view_arr.length && view_to !== false" style="max-width: fit-content">
                <div class="input-group">
                    <label class="input-group-text border border-primary" for="pagination_view">
                        <i class="fa fa-list" />
                    </label>
                    <select
                        @change="data.view = parseInt($event.target.value); $root.getList()" 
                        class="form-select border border-primary"
                        id="pagination_view"
                    >
                        <option
                            v-for="v in data.view_arr"
                            :value="v"
                            :selected="data.view == v ? 'selected' : ''"
                        >{{ v }}</option>
                    </select>
                </div>
            </div>
        </div>
    `
});


Vue.component('c-document', {
    props: ['doc'],
    methods: {
        convertDate: function(date) {
            return date.split('-').reverse().join('.');
        }
    },
    template: `
        <div class="card border-secondary-subtle mb-4">

            <div class="card-header fw-bold fs-5 bg-secondary bg-opacity-25 border-secondary-subtle">
                {{ doc.number }} от {{ convertDate(doc.date) }}
            </div>

            <div class="card-body bg-secondary bg-opacity-10 pb-0">
                <template v-if="doc.detail">
                    <table v-if="doc.detail.length" class="table table-bordered align-middle fs-6 table-hover">
                        <thead>
                            <tr class="table-light border-dark-subtle">
                                <th scope="col" class="px-2 py-0 bg-dark-subtle">Спецификация</th>
                                <th scope="col" class="px-2 py-0 bg-dark-subtle text-end" style="width: 10rem">Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="detail in doc.detail" class="border-dark-subtle">
                                <td class="px-2 py-0">{{ detail.name }}</td>
                                <td class="px-2 py-0 text-end">{{ detail.price }}</td>
                            </tr>
                            <tr class="table-light border-dark-subtle fw-bold">
                                <td class="px-2 py-0 bg-dark-subtle">ИТОГО</td>
                                <td class="px-2 py-0 bg-dark-subtle text-end">{{ doc.total }}</td>
                            </tr>
                        </tbody>
                    </table>
                </template>

                <p v-else>
                    <i class="fa fa-exclamation-circle text-danger" /> Спецификация не указана
                </p>

                <p v-if="doc.comment">
                    <span class="fw-bold">Коментарий:</span>
                    {{ doc.comment }}
                </p>
            </div>

            <div class="card-footer bg-secondary bg-opacity-25 border-secondary-subtle">
                <a @click.prevent="$emit('open', doc)" class="link-underline link-underline-opacity-0 me-3" href="#">
                    <i class="fa fa-pencil-square me-1" />Редактировать
                </a>
                <a @click.prevent="$emit('delete', doc)" class="link-underline link-underline-opacity-0 link-danger" href="#">
                    <i class="fa fa-trash-o me-1" />Удалить
                </a>
            </div>

        </div>
    `
});


Vue.component('c-form', {
    props: ['doc'],
    data: function() {
        return {
            type: Object.keys(this.doc).length,
            form_doc: {
                id: this.doc.id || '',
                number: this.doc.number || '',
                date: this.doc.date || '',
                comment: this.doc.comment || '',
                detail: this.doc.detail ? JSON.parse(JSON.stringify(this.doc.detail)) : []
            },
            date: {
                min: '2000-01-01',
                max: '2100-01-01'
            },
            dublicate: {}
        }
    },
    computed: {
        total: function() {
            let total = 0;
            for (let i in this.form_doc.detail) {
                let price = this.formatPrice(this.form_doc.detail[i].price);
                total += parseFloat(price) || 0;
            }
            return total.toFixed(2);
        }
    },
    methods: {
        addDetail: function() {
            this.form_doc.detail.push({'name': '', 'price': ''});
        },
        deleteDetail: function(i) {
            this.form_doc.detail.splice(i, 1)
        },
        dublicateName: function() {
            this.dublicate = {};
            let det = this.form_doc.detail;
            for (let i = 0; i < det.length; i++) {
                if (det[i] == '') continue;
                if (this.dublicate[i]) continue;
                for (let j = i + 1; j < det.length; j++) {
                    if (det[j].name == '') continue;
                    if (det[i].name == det[j].name) {
                        this.dublicate[i] = true;
                        this.dublicate[j] = true;
                    }
                }
            }
        },
        inputPrice: function(i) {
            this.form_doc.detail[i].price = this.formatPrice(this.form_doc.detail[i].price);
        },
        formatPrice: function(val) {
            val = String(val).replace(/[^\d.,]/g, '').replace(',', '.');
            if (val == '') val = 0.00;
            val = parseFloat(val).toFixed(2);
            //if (val == 0.00) val = '';
            return val;
        }
    },
    template: `
        <div>

            <h1 v-if="type">Редактирование документа</h1>
            <h1 v-else>Создание документа</h1>

            <div class="card border-secondary-subtle my-4">

                <div class="card-header bg-secondary bg-opacity-25 border-secondary-subtle was-validated fw-bold fs-5 pb-0">

                    <div class="row">
                        <div class="col-auto pe-1  mb-2">
                            <input
                                v-model.trim="form_doc.number"
                                type="text"
                                class="form-control form-control-sm"
                                placeholder="Номер"
                                required
                            />
                        </div>
                        <div class="d-flex col-auto mb-2">
                            <input
                                v-model.trim="form_doc.date"
                                type="date"
                                class="form-control form-control-sm"
                                :min="date.min"
                                :max="date.max"
                                placeholder="Дата"
                                required
                            />
                        </div>
                    </div>

                </div>
                <div class="card-body bg-secondary bg-opacity-10 pb-0">

                    <table class="table table-bordered align-middle fs-6 table-hover">

                        <thead>
                            <tr class="table-light border-dark-subtle">
                                <th class="bg-dark-subtle" style="width: 1rem"></th>
                                <th scope="col" class="px-2 py-0 bg-dark-subtle">Спецификация</th>
                                <th scope="col" class="px-2 py-0 bg-dark-subtle text-end" style="width: 10rem">Сумма</th>
                            </tr>
                        </thead>

                        <tbody>
                            <template v-if="form_doc.detail">
                                <tr v-for="(detail, i) in form_doc.detail" :key="i" class="border-dark-subtle">
                                    <td class="bg-body-secondary">
                                        <button @click="deleteDetail(i)" type="button" class="btn btn-danger btn-sm">
                                            <i class="fa fa-minus-circle" />
                                        </button>
                                    </td>
                                    <td class="bg-body-secondary">
                                        <input
                                            v-model.trim="detail.name"
                                            @focusout='dublicateName()'
                                            :class="detail.name && !dublicate[i] ? 'is-valid': 'is-invalid'"
                                            class="form-control form-control-sm m-0"
                                            placeholder="Наименование"
                                            type="text"
                                            required
                                        />
                                    </td>
                                    <td class="bg-body-secondary" >
                                        <input
                                            v-model.trim="detail.price"
                                            @focusout='inputPrice(i)'
                                            :class="detail.price ? 'is-valid' : 'is-invalid'"
                                            class="form-control form-control-sm text-end m-0"
                                            placeholder="0.00"
                                            type="text"
                                            required
                                        />
                                    </td>
                                </tr>
                            </template>
                            <tr class="border-dark-subtle">
                                <td class="bg-body-secondary">
                                    <button @click="addDetail()" type="button" class="btn btn-primary btn-sm">
                                        <i class="fa fa-plus-circle" />
                                    </button>
                                </td>
                                <td class="bg-body-secondary"></td>
                                <td class="bg-body-secondary"></td>
                            </tr>
                            <tr class="table-light border-dark-subtle fw-bold">
                                <th class="bg-dark-subtle"></th>
                                <th class="px-2 py-0 bg-dark-subtle">ИТОГО</th>
                                <th class="px-2 py-0 bg-dark-subtle text-end">{{ total }}</th>
                            </tr>
                        </tbody>

                    </table>

                    <p>
                        <textarea v-model.trim="form_doc.comment" class="form-control form-control-sm" rows="5" placeholder="Комментарий" style="resize: none"></textarea>
                    </p>
                </div>

                <div class="card-footer bg-secondary bg-opacity-25 border-secondary-subtle">
                    <a @click.prevent="$emit('save', {form_doc, dublicate})" class="link-underline link-underline-opacity-0 me-3" href="#">
                        <i class="fa fa-pencil-square me-1" />Сохранить
                    </a>
                    <a @click.prevent="$emit('close')" class="link-underline link-underline-opacity-0 link-danger" href="#">
                        <i class="fa fa-trash-o me-1" />Отмена
                    </a>
                </div>

            </div>
        </div>
    `
});


Vue.component('c-animation', {
    props: ['data'],
    template: `
        <div v-if="data.run" class="position-fixed w-100 h-100" style="z-index: 1000">
            <div class="bg-light bg-opacity-50 w-100 h-100 d-flex justify-content-center d-flex align-items-center">
                <div class="spinner-border text-danger" role="status" style="width: 7rem; height: 7rem;"></div>
            </div>
        </div>
    `
});


Vue.component('c-error-panel', {
    props: ['data'],
    template: `
        <div v-if="data.error" class="alert alert-danger">
            <p class="h4">
                <i class="fa fa-exclamation-triangle" />
                <span class="ms-1">ОШИБКА</span>
            </p>
            <div>{{ data.error }}</div>
        </div>
    `
});