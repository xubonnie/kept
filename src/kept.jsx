/** @jsx React.DOM */

var initial = [
  {id: 1, type: "text", title: "This is a Text entry", text: "Hello World."},
  {id: 2, type: "todo", title: "This is a Todo entry", tasks: [
    {label: "Plop", done: false},
    {label: "Plap", done: true}
  ]}
];

function nextId(items) {
  return Math.max.apply(null, items.concat([0]).map(function(item) {
    return item.id || 0;
  })) + 1;
}

function KeptStore(options) {
  options = options || {};
  this._store = options.store || localStorage;
}

KeptStore.prototype = {
  load: function() {
    try {
      return JSON.parse(this._store.getItem("keep.data")) || [];
    } catch (e) {
      console.error("failed loading keep data", e);
      return [];
    }
  },

  save: function(data) {
    try {
      this._store["keep.data"] = JSON.stringify(data);
    } catch (e) {
      console.error("failed saving keep data", e);
    }
  }
};

var Modal = React.createClass({
  handleClose: function() {
    if (this.props.close)
      this.props.close();
  },

  render: function() {
    return (
      <div style={{display: "block"}} className="modal" tabindex="-1" role="dialog"
           aria-labelledby="myModalLabel" aria-hidden="false">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal" aria-hidden="true"
                      onClick={this.handleClose}>&times;</button>
              <h4 className="modal-title">{this.props.title}</h4>
            </div>
            <div className="modal-body">
              {this.props.children}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
              <button type="button" className="btn btn-primary">Save changes</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

var KeptApp = React.createClass({
  store: new KeptStore(),

  getInitialState: function() {
    return {
      items: this.store.load()
    };
  },

  _forms: {
    text: function(data) {
      return <KeptTextForm resetForm={this.resetForm} create={this.create} update={this.update} data={data} />;
    },

    todo: function(data) {
      return <KeptTodoForm resetForm={this.resetForm} create={this.create} update={this.update} data={data} />;
    }
  },

  formCreator: function(type) {
    return function(data) {
      this.setState({form: this._forms[type].call(this, data)});
    }.bind(this);
  },

  resetForm: function() {
    this.setState({form: null});
  },

  create: function(itemData) {
    itemData.id = nextId(this.state.items);
    var items = this.state.items.concat([itemData]);
    this.setState({form: null, items: items});
    this.store.save(items);
  },

  edit: function(itemData) {
    this.formCreator(itemData.type)(itemData);
  },

  update: function(updatedItem) {
    var items = this.state.items.map(function(item) {
      if (item.id === updatedItem.id)
        return updatedItem;
      return item;
    });
    this.store.save(items);
    this.setState({form: null, items: items});
  },

  remove: function(itemData) {
    var items = this.state.items.filter(function(data) {
      return itemData !== data;
    });
    this.setState({items: items});
    this.store.save(items);
  },

  move: function(fromIndex, toIndex) {
    var items = this.state.items;
    items.splice(toIndex, 0, items.splice(fromIndex, 1)[0]);
    this.setState({items: items});
    this.store.save(items);
  },

  render: function() {
    return (
      <div>
        <KeptMenuBar formCreator={this.formCreator} />
        {this.state.form}
        <KeptItems items={this.state.items}
                   edit={this.edit}
                   update={this.update}
                   remove={this.remove}
                   move={this.move} />
      </div>
    );
  }
});

var KeptMenuBar = React.createClass({
  newItem: function(type) {
    return this.props.formCreator(type).bind(null, {});
  },

  render: function() {
    // FIXME responsive menu display not available without jQuery -_-'
    return (
      <nav className="navbar navbar-default" role="navigation">
        <div className="container-fluid">
          <div className="navbar-header">
            <a className="navbar-brand" href="#">Kept</a>
          </div>
          <div>
            <ul className="nav navbar-nav">
              <li><a href="#" onClick={this.newItem("text")}>Text</a></li>
              <li><a href="#" onClick={this.newItem("todo")}>Todo</a></li>
            </ul>
          </div>
        </div>
      </nav>
    );
  }
});

var KeptItems = React.createClass({
  render: function() {
    return <div className="kept-list">{
      this.props.items.map(function(itemData, key) {
        return <KeptEntry key={key} itemData={itemData}
                  edit={this.props.edit}
                  remove={this.props.remove}
                  update={this.props.update}
                  move={this.props.move} />
      }.bind(this))
    }</div>
  }
});

var IconButton = React.createClass({
  getDefaultProps: function() {
    return {
      type: "default",
      icon: undefined,
      label: "Button"
    };
  },

  render: function() {
    var btnClass = "btn btn-sm btn-" + this.props.type;
    var iconClass = "glyphicon glyphicon-" + this.props.icon;
    return (
      <button className={btnClass} onClick={this.props.onClick}>
        <span className={iconClass}></span>&nbsp;{this.props.label}
      </button>
    );
  }
});

var Panel = React.createClass({
  render: function() {
    var editBtn, deleteBtn;
    if (this.props.edit)
      editBtn = <IconButton icon="edit" label="Edit" onClick={this.props.edit} />;
    if (this.props.delete)
      deleteBtn = <IconButton icon="trash" type="danger" label="Delete" onClick={this.props.delete} />;
    return (
      <div className="kept-panel panel panel-primary">
        <header className="panel-heading">
          <h3 className="panel-title">{this.props.title}</h3>
        </header>
        <section className="panel-body">{this.props.children}</section>
        <footer className="panel-footer">
          <div className="btn-group">{editBtn} {deleteBtn}</div>
        </footer>
      </div>
    );
  }
});

var KeptEntry = React.createClass({
  _components: {
    text: function(itemData) {
      return <KeptText data={itemData} />;
    },

    todo: function(itemData) {
      return <KeptTodo data={itemData} update={this.props.update} />;
    }
  },

  getComponent: function(data) {
    return this._components[data.type].call(this, data);
  },

  handleClickEdit: function() {
    this.props.edit(this.props.itemData);
  },

  handleClickDelete: function() {
    this.props.remove(this.props.itemData);
  },

  handleDragStart: function(event) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData('text/plain', this.props.key);
  },

  handleDragEnter: function(event) {
    event.preventDefault();
  },

  handleDragLeave: function(event) {
    this.unhighlight();
    event.preventDefault();
  },

  handleOnDragOver: function(event) {
    event.preventDefault();
    this.highlight();
  },

  handleOnDrop: function(event) {
    event.preventDefault();
    this.unhighlight();
    this.props.move(event.dataTransfer.getData("text/plain"), this.props.key);
  },

  highlight: function() {
    this.getDOMNode().querySelector(".panel").classList.add("targetted");
  },

  unhighlight: function() {
    this.getDOMNode().querySelector(".panel").classList.remove("targetted");
  },

  render: function() {
    return (
      <div onDragStart={this.handleDragStart}
           onDragEnter={this.handleDragEnter}
           onDragOver={this.handleOnDragOver}
           onDrop={this.handleOnDrop}
           onDragLeave={this.handleDragLeave}
           draggable="true">
        <Panel title={this.props.itemData.title || "Untitled"}
               edit={this.handleClickEdit}
               delete={this.handleClickDelete}>
          {this.getComponent(this.props.itemData)}
        </Panel>
      </div>
    );
  }
});

var KeptText = React.createClass({
  render: function() {
    var data = this.props.data;
    return (
      <div className="text-entry">
        <div className="text-entry-text">{data.text}</div>
      </div>
    );
  }
});

var KeptTextForm = React.createClass({
  handleCancel: function() {
    this.props.resetForm();
  },

  handleSubmit: function() {
    var id = parseInt(this.refs.id.getDOMNode().value.trim(), 10);
    var process = id ? this.props.update : this.props.create;
    process({
      type: "text",
      id: id,
      title: this.refs.title.getDOMNode().value.trim(),
      text: this.refs.text.getDOMNode().value.trim()
    });
  },

  componentDidMount: function() {
    this.getDOMNode().querySelector("textarea").focus();
  },

  render: function() {
    var data = this.props.data;
    return (
      <Modal title="Create new Text" close={this.props.resetForm}>
        <form role="form" onSubmit={this.handleSubmit}>
          <input type="hidden" ref="id" defaultValue={data.id} />
          <div className="form-group">
            <input ref="title" type="text" className="form-control" placeholder="Title" defaultValue={data.title} />
          </div>
          <div className="form-group">
            <textarea ref="text" className="form-control" placeholder="Text…" defaultValue={data.text} rows="5" required />
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-primary">OK</button>
            &nbsp;
            <a href="#" onClick={this.handleCancel}>Cancel</a>
          </div>
        </form>
      </Modal>
    );
  }
});

var ProgressBar = React.createClass({
  getDefaultProps: function() {
    return {
      minValue: 0,
      maxValue: 100
    };
  },

  render: function() {
    return (
      <div className="progress">
        <div className="progress-bar"
             role="progressbar"
             aria-valuenow={this.props.value}
             aria-valuemin={this.props.minValue}
             aria-valuemax={this.props.maxValue}
             style={{width: this.props.value + "%"}}>
          <span>{this.props.value}%</span>
        </div>
      </div>
    );
  }
});

var KeptTodo = React.createClass({
  getInitialState: function() {
    return {tasks: this.props.data.tasks};
  },

  // this is needed to map newly received props to current state
  componentWillReceiveProps: function(props) {
    this.setState({tasks: props.data.tasks});
  },

  clearCompleted: function() {
    this.updateTasks(this.state.tasks.filter(function(task) {
      return !task.done;
    }));
  },

  toggle: function(key) {
    this.updateTasks(this.state.tasks.map(function(task, i) {
      if (i !== key)
        return task;
      task.done = !task.done;
      return task;
    }));
  },

  updateTasks: function(tasks) {
    this.props.update({
      type: "todo",
      id: this.props.data.id,
      title: this.props.data.title,
      tasks: tasks
    });
    this.setState({tasks: tasks});
  },

  getProgress: function() {
    var done = this.state.tasks.filter(function(task) {
      return !!task.done;
    }).length;
    if (!this.state.tasks.length)
      return 0;
    return Math.round(done * 100 / this.state.tasks.length);
  },

  render: function() {
    var progress = 60;
    return (
      <div>
        <ProgressBar value={this.getProgress()} />
        <ul className="list-group">{
          this.state.tasks.map(function(task, key) {
            return <KeptTodoTask key={key} data={task} toggle={this.toggle} />
          }.bind(this))
        }</ul>
        <p><a href="#" onClick={this.clearCompleted}>Clear completed</a></p>
      </div>
    );
  }
});

var KeptTodoTask = React.createClass({
  handleChange: function() {
    this.props.toggle(this.props.key);
  },

  render: function() {
    var data = this.props.data;
    return (
      <li className="list-group-item">
        <label className={data.done ? "done" : ""}>
          <input type="checkbox" ref="done" onChange={this.handleChange} checked={data.done ? "checked" : ""} />
          <span className="todo-item-label">{data.label}</span>
        </label>
      </li>
    );
  }
});

var KeptTodoForm = React.createClass({
  getDefaultEntries: function() {
    return [{label: ""}];
  },

  getInitialState: function() {
    return {
      tasks: this.props.data && this.props.data.tasks || this.getDefaultEntries()
    };
  },

  addTask: function(event) {
    event.preventDefault();
    this.setState({
      tasks: this.state.tasks.concat(this.getDefaultEntries())
    });
    setTimeout(this.focusLatestInput, 0);
  },

  focusLatestInput: function() {
    var inputs = this.getDOMNode().querySelectorAll("input[type=text]");
    inputs[inputs.length - 1].focus();
  },

  handleCancel: function() {
    this.props.resetForm();
  },

  handleSubmit: function() {
    var id = parseInt(this.refs.id.getDOMNode().value.trim(), 10);
    var process = id ? this.props.update : this.props.create;
    process({
      type: "todo",
      id: id,
      title: this.refs.title.getDOMNode().value.trim(),
      tasks: (this.state.tasks || []).filter(function(task) {
        return !!task.label;
      })
    });
  },

  updateTask: function(key, data) {
    this.setState({
      tasks: this.state.tasks.map(function(task, index) {
        return index === key ? data : task;
      })
    });
  },

  removeTask: function(key) {
    this.setState({
      tasks: this.state.tasks.filter(function(task, index) {
        return index !== key;
      })
    });
  },

  componentDidMount: function() {
    this.focusLatestInput();
  },

  render: function() {
    console.log("---");
    return (
      <Modal title="Create new Todo" close={this.props.resetForm}>
        <form className="todo-form" role="form" onSubmit={this.handleSubmit}>
          <input type="hidden" ref="id" defaultValue={this.props.data.id} />
          <div className="form-group">
            <input ref="title" type="text" className="form-control" placeholder="Title" defaultValue={this.props.data.title} />
          </div>
          <ul className="list-group">{
            this.state.tasks.map(function(task, key) {
              return <KeptTodoTaskForm key={key} data={task} updateTask={this.updateTask} removeTask={this.removeTask} />
            }, this)
          }</ul>
          <div className="form-group">
            <button className="btn btn-default" onClick={this.addTask}>Add task</button>
            &nbsp;
            <button className="btn btn-primary" type="submit">Save</button>
            &nbsp;
            <a href="#" onClick={this.handleCancel}>Cancel</a>
          </div>
        </form>
      </Modal>
    );
  }
});

var KeptTodoTaskForm = React.createClass({
  handleUpdate: function() {
    this.props.updateTask(this.props.key, {
      label: this.refs.label.getDOMNode().value.trim(),
      done: this.refs.done.getDOMNode().checked
    });
  },

  handleRemove: function(event) {
    event.preventDefault();
    this.props.removeTask(this.props.key);
  },

  render: function() {
    var data = this.props.data;
    console.log("rendering KeptTodoTaskForm", data.label);
    return (
      <li className="form-inline list-group-item form-group">
        <input ref="done" type="checkbox" onChange={this.handleUpdate} checked={data.done ? "checked" : ""} />
        &nbsp;&nbsp;&nbsp;
        <input ref="label" type="text" className="form-control" placeholder="Label…" defaultValue={data.label}
               onBlur={this.handleUpdate} />
        &nbsp;&nbsp;&nbsp;
        <a className="danger" href="#" onClick={this.handleRemove} title="Remove task">
          <span className="glyphicon glyphicon-remove"></span>
        </a>
      </li>
    );
  }
});

React.renderComponent(<KeptApp/>, document.getElementById('kept'));