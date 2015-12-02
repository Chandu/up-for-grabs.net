(function(host, _) {
  var applyTagsFilter = function (projects, tags) {
    if (typeof tags === "string") {
      tags = tags.split(",");
    }

    tags = _.map(tags, function(entry){
      return entry && entry.replace(/^\s+|\s+$/g, "");
    });

    if(!tags || !tags.length || tags[0] == "") {
      return projects;
    }

    return _.filter(projects, function(project){
      var projectTags = project.tags;
      var bContinue = true; 
      //Can this be made efficient? May be ...
      for(var i=0; i< tags.length; i++) {
        if(!bContinue) {
          break;
        }
        var needle = tags[i].toLowerCase();
        for(var j=0; j < projectTags.length; j++) {
          if(projectTags[j].toLowerCase() === needle) {
            bContinue = true;
            break;
          } else {
            bContinue = false;
          }
        }
      }
      return bContinue;
    });
  };

  var TagBuilder = function(){
    var _tagsMap = {},
        _orderedTagsMap = null;

    this.addTag = function(tag, projectName){
      var tagLowerCase = tag.toLowerCase();
      if(!_.has(_tagsMap, tagLowerCase)) {
        _tagsMap[tagLowerCase] = {
          "name": tag,
          "frequency": 0,
          "projects": []
        };
      }
      var _entry = _tagsMap[tagLowerCase];
      _entry.frequency++;
      _entry.projects.push(projectName);
    };

    this.getTagsMap = function(){
      //http://stackoverflow.com/questions/16426774/underscore-sortby-based-on-multiple-attributes
      return _orderedTagsMap = _orderedTagsMap || _(_tagsMap).chain().sortBy(function(tag, key){
        return key;
      }).sortBy(function(tag, key){
        return tag.frequency * -1;
      }).value();
    };
  }

  var extractTags = function(projectsData) {
    var tagBuilder = new TagBuilder();
    _.each(projectsData, function(entry){
      _.each(entry.tags, function(tag){
        tagBuilder.addTag(tag, entry.name);
      });
    });
    return tagBuilder.getTagsMap();
  };

  var extractProjectsAndTags = function(projectsData) {
    return {
      "projects": projectsData,
      "tags": extractTags(projectsData)
    };
  };

  var ProjectsService = function (projectsData) {
    var _projectsData = extractProjectsAndTags(projectsData);
    var tagsMap = {};

    var canStoreOrdering = (JSON && sessionStorage && sessionStorage.getItem
                            && sessionStorage.setItem);
    var ordering = null;
    if (canStoreOrdering) {
      ordering = sessionStorage.getItem("projectOrder");
      if (ordering) {
        ordering = JSON.parse(ordering);

        // This prevents anyone's page from crashing if a project is removed
        if (ordering.length !== _projectsData.projects.length) {
          ordering = null;
        }
      }
    }

    if (!ordering) {
      ordering = _.shuffle(_.range(_projectsData.projects.length));
      if (canStoreOrdering) {
        sessionStorage.setItem("projectOrder", JSON.stringify(ordering));
      }
    }

    var projects = _.map(ordering,
                         function(i) { return _projectsData.projects[i]; });

    _.each(_projectsData.tags, function(tag){
      tagsMap[tag.name.toLowerCase()] = tag;
    });

    this.get = function(tags){
      return applyTagsFilter(projects, tags);
    };

    this.getTags = function() {
      return tagsMap;
    };

    this.getPopularTags = function (popularTagCount) {
      return _.take(_.values(tagsMap), popularTagCount || 10);
    }
  };

  host.ProjectsService = ProjectsService;

})(window, _);
