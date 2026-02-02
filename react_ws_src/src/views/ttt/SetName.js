import React, { Component } from 'react'

export default class SetName extends Component {

	constructor(props) {
		super(props)

		this.state = {
			name: (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('xttt_username')) || ''
		}
	}

	//	------------------------	------------------------	------------------------

	render() {
		return (
			<div id='SetName'>

				<h1>Set Name</h1>

				<div ref='nameHolder' className='input_holder left'>
					<label>Name </label>
					<input ref='name' type='text' className='input name' placeholder='Name' defaultValue={this.state.name} />
				</div>


				<button type='submit' onClick={this.saveName.bind(this)} className='button'><span>SAVE <span className='fa fa-caret-right'></span></span></button>

			</div>
		)
	}

	//	------------------------	------------------------	------------------------

	saveName(e) {
		// const { name } = this.refs
		// const { onSetName } = this.props
		// onSetName(name.value.trim())

		const name = this.refs.name.value.trim()
		if (typeof window !== 'undefined' && window.localStorage) {
			window.localStorage.setItem('xttt_username', name)
		}

		this.props.onSetName(name)
	}

}
